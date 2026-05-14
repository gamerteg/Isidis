import type { AuthError, SupabaseClient, User } from '@supabase/supabase-js'
import { getPostAuthDestination, sanitizeNextPath as sanitizeBootstrapNextPath } from '@/lib/bootstrap'
import { createClient } from '@/lib/supabase/client'
import { validateCPF } from '@/lib/utils'

type UserRole = 'CLIENT' | 'READER' | 'ADMIN'

export type AuthServiceSuccess = {
  ok: true
  destination?: string
}

export type AuthServiceError = {
  ok: false
  error: string
}

export type AuthServiceResult = AuthServiceSuccess | AuthServiceError

export type ProfileRecord = {
  id: string
  role: UserRole
  full_name?: string | null
  avatar_url?: string | null
  sexo?: string | null
  tax_id?: string | null
  cpf_cnpj?: string | null
  cellphone?: string | null
}

export type EnsureUserProfileDefaults = {
  role?: UserRole
  fullName?: string | null
  avatarUrl?: string | null
  sexo?: string | null
  taxId?: string | null
  cpfCnpj?: string | null
  cellphone?: string | null
}

type ServiceOptions = {
  supabase?: SupabaseClient
}

type SignInWithPasswordInput = {
  email: string
  password: string
  next?: string | null
}

type SignUpWithPasswordInput = {
  fullName: string
  email: string
  password: string
  next?: string | null
  sexo?: string | null
  cpf?: string | null
  cellphone?: string | null
}

type SignInWithGoogleInput = {
  next?: string | null
}

export function sanitizeNextPath(next?: string | null) {
  return sanitizeBootstrapNextPath(next)
}

export function cleanDigits(value?: string | null) {
  const digits = value?.replace(/\D/g, '') ?? ''
  return digits.length > 0 ? digits : null
}

export function mapAuthError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'Email ou senha incorretos.'
  }

  if (
    message.includes('user already registered') ||
    message.includes('already registered') ||
    message.includes('already exists')
  ) {
    return 'Este email já está cadastrado.'
  }

  if (message.includes('oauth') || message.includes('provider')) {
    return 'Não foi possível entrar com Google. Tente novamente.'
  }

  return 'Ocorreu um erro inesperado. Tente novamente.'
}

export async function ensureUserProfile(
  user: User,
  defaults: EnsureUserProfileDefaults = {},
  options: ServiceOptions = {},
) {
  const supabase = getSupabase(options)
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id, role, full_name, avatar_url, sexo, tax_id, cpf_cnpj, cellphone')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    throw selectError
  }

  if (existingProfile) {
    const profilePatch = buildMissingProfilePatch(
      existingProfile as ProfileRecord,
      defaults,
      user.user_metadata ?? {},
    )

    if (Object.keys(profilePatch).length > 0) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(profilePatch)
        .eq('id', user.id)
        .select('id, role, full_name, avatar_url, sexo, tax_id, cpf_cnpj, cellphone')
        .single()

      if (updateError) {
        throw updateError
      }

      return {
        profile: (updatedProfile ?? { ...existingProfile, ...profilePatch }) as ProfileRecord,
        createdOrUpdated: true,
      }
    }

    return {
      profile: existingProfile as ProfileRecord,
      createdOrUpdated: false,
    }
  }

  const metadata = user.user_metadata ?? {}
  const profile: ProfileRecord = {
    id: user.id,
    role: defaults.role ?? normalizeRole(metadata.role) ?? 'CLIENT',
    full_name:
      defaults.fullName ??
      normalizeString(metadata.full_name) ??
      normalizeString(metadata.name) ??
      null,
    avatar_url:
      defaults.avatarUrl ??
      normalizeString(metadata.avatar_url) ??
      normalizeString(metadata.picture) ??
      null,
    sexo: defaults.sexo ?? null,
    tax_id: defaults.taxId ?? null,
    cpf_cnpj: defaults.cpfCnpj ?? defaults.taxId ?? null,
    cellphone: defaults.cellphone ?? null,
  }

  const { data: upsertedProfile, error: upsertError } = await supabase
    .from('profiles')
    .upsert(profile)
    .select('id, role, full_name, avatar_url, sexo, tax_id, cpf_cnpj, cellphone')
    .single()

  if (upsertError) {
    throw upsertError
  }

  return {
    profile: (upsertedProfile ?? profile) as ProfileRecord,
    createdOrUpdated: true,
  }
}

export async function signInWithPassword(
  input: SignInWithPasswordInput,
  options: ServiceOptions = {},
): Promise<AuthServiceResult> {
  const supabase = getSupabase(options)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }

  const user = data.user
  if (!user) {
    return { ok: false, error: 'Ocorreu um erro ao entrar. Tente novamente.' }
  }

  try {
    const { profile } = await ensureUserProfile(user, {}, { supabase })
    const destination = await getPostAuthDestination(profile.role, user.id, input.next)
    return { ok: true, destination }
  } catch {
    const destination = await getPostAuthDestination(
      normalizeRole(user.user_metadata?.role),
      user.id,
      input.next,
    )
    return { ok: true, destination }
  }
}

export async function signUpWithPassword(
  input: SignUpWithPasswordInput,
  options: ServiceOptions = {},
): Promise<AuthServiceResult> {
  const cleanedCpf = cleanDigits(input.cpf)
  const cleanedPhone = cleanDigits(input.cellphone)

  if (input.cpf && !validateCPF(input.cpf)) {
    return { ok: false, error: 'O CPF informado é inválido.' }
  }

  const supabase = getSupabase(options)
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        role: 'CLIENT',
      },
    },
  })

  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }

  if (!data.user) {
    return { ok: true, destination: '/register/confirm' }
  }

  try {
    await ensureUserProfile(
      data.user,
      {
        role: 'CLIENT',
        fullName: input.fullName,
        sexo: input.sexo ?? null,
        taxId: cleanedCpf,
        cpfCnpj: cleanedCpf,
        cellphone: cleanedPhone,
      },
      { supabase },
    )
  } catch {
    return {
      ok: false,
      error:
        'Sua conta foi criada, mas não foi possível salvar todos os dados do perfil. Tente entrar novamente para completar seu cadastro.',
    }
  }

  if (!data.session) {
    return { ok: true, destination: '/register/confirm' }
  }

  const destination = await getPostAuthDestination('CLIENT', data.user.id, input.next)
  return { ok: true, destination }
}

export async function signInWithGoogle(
  input: SignInWithGoogleInput = {},
  options: ServiceOptions = {},
): Promise<AuthServiceResult> {
  const supabase = getSupabase(options)
  const redirectTo = buildOAuthRedirectTo(input.next)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }

  return { ok: true }
}

export async function handleOAuthCallback(
  searchParams: URLSearchParams,
  options: ServiceOptions = {},
): Promise<AuthServiceResult> {
  const supabase = getSupabase(options)
  const oauthError = searchParams.get('error') || searchParams.get('error_description')

  if (oauthError) {
    return { ok: false, error: 'Não foi possível entrar com Google. Tente novamente.' }
  }

  const code = searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return { ok: false, error: mapAuthError(error) }
    }
  }

  const { data, error } = await supabase.auth.getUser()
  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }

  if (!data.user) {
    return { ok: false, error: 'Não foi possível entrar com Google. Tente novamente.' }
  }

  try {
    const { profile } = await ensureUserProfile(
      data.user,
      {
        role: 'CLIENT',
        fullName:
          normalizeString(data.user.user_metadata?.full_name) ??
          normalizeString(data.user.user_metadata?.name) ??
          null,
        avatarUrl:
          normalizeString(data.user.user_metadata?.avatar_url) ??
          normalizeString(data.user.user_metadata?.picture) ??
          null,
      },
      { supabase },
    )
    const destination = await getPostAuthDestination(
      profile.role,
      data.user.id,
      searchParams.get('next'),
    )
    return { ok: true, destination }
  } catch {
    return {
      ok: false,
      error:
        'Sua conta foi criada, mas não foi possível salvar todos os dados do perfil. Tente entrar novamente para completar seu cadastro.',
    }
  }
}

function getSupabase(options: ServiceOptions) {
  return options.supabase ?? createClient()
}

function buildOAuthRedirectTo(next?: string | null) {
  const origin = window.location.origin
  const callbackUrl = new URL('/auth/callback', origin)
  const safeNext = sanitizeNextPath(next)

  if (safeNext) {
    callbackUrl.searchParams.set('next', safeNext)
  }

  return callbackUrl.toString()
}

function getErrorMessage(error: unknown) {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return (error as Partial<AuthError>)?.message ?? ''
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function normalizeRole(value: unknown): UserRole | undefined {
  return value === 'CLIENT' || value === 'READER' || value === 'ADMIN' ? value : undefined
}

function buildMissingProfilePatch(
  profile: ProfileRecord,
  defaults: EnsureUserProfileDefaults,
  metadata: Record<string, unknown>,
) {
  const patch: Partial<ProfileRecord> = {}
  const fullName =
    defaults.fullName ??
    normalizeString(metadata.full_name) ??
    normalizeString(metadata.name)
  const avatarUrl =
    defaults.avatarUrl ??
    normalizeString(metadata.avatar_url) ??
    normalizeString(metadata.picture)
  const cpfCnpj = defaults.cpfCnpj ?? defaults.taxId ?? null

  if (!profile.full_name && fullName) patch.full_name = fullName
  if (!profile.avatar_url && avatarUrl) patch.avatar_url = avatarUrl
  if (!profile.sexo && defaults.sexo) patch.sexo = defaults.sexo
  if (!profile.tax_id && defaults.taxId) patch.tax_id = defaults.taxId
  if (!profile.cpf_cnpj && cpfCnpj) patch.cpf_cnpj = cpfCnpj
  if (!profile.cellphone && defaults.cellphone) patch.cellphone = defaults.cellphone

  return patch
}
