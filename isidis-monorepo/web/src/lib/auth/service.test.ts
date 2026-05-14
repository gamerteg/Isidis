import { describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import {
  cleanDigits,
  ensureUserProfile,
  mapAuthError,
  sanitizeNextPath,
} from './service'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-05-14T00:00:00.000Z',
    user_metadata: {},
    ...overrides,
  } as User
}

function makeSupabaseMock(config: {
  selectData?: unknown
  selectError?: unknown
  upsertData?: unknown
  upsertError?: unknown
  updateData?: unknown
  updateError?: unknown
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: config.selectData ?? null,
    error: config.selectError ?? null,
  })
  const eq = vi.fn(() => ({ maybeSingle }))
  const selectForLookup = vi.fn(() => ({ eq }))
  const single = vi.fn().mockResolvedValue({
    data: config.upsertData ?? null,
    error: config.upsertError ?? null,
  })
  const selectAfterUpsert = vi.fn(() => ({ single }))
  const upsert = vi.fn(() => ({ select: selectAfterUpsert }))
  const updateSingle = vi.fn().mockResolvedValue({
    data: config.updateData ?? null,
    error: config.updateError ?? null,
  })
  const updateSelect = vi.fn(() => ({ single: updateSingle }))
  const updateEq = vi.fn(() => ({ select: updateSelect }))
  const update = vi.fn(() => ({ eq: updateEq }))
  const from = vi.fn(() => ({ select: selectForLookup, upsert, update }))

  return {
    supabase: { from },
    spies: {
      from,
      selectForLookup,
      eq,
      maybeSingle,
      upsert,
      selectAfterUpsert,
      single,
      update,
      updateEq,
      updateSelect,
      updateSingle,
    },
  }
}

describe('auth service helpers', () => {
  it('cleans CPF/phone-like values to digits', () => {
    expect(cleanDigits('529.982.247-25')).toBe('52998224725')
    expect(cleanDigits('(11) 99999-9999')).toBe('11999999999')
    expect(cleanDigits('abc')).toBeNull()
    expect(cleanDigits(null)).toBeNull()
  })

  it('sanitizes next paths to internal relative paths only', () => {
    expect(sanitizeNextPath('/dashboard')).toBe('/dashboard')
    expect(sanitizeNextPath('/quiz-onboarding?from=login')).toBe('/quiz-onboarding?from=login')
    expect(sanitizeNextPath('https://evil.example/path')).toBeNull()
    expect(sanitizeNextPath('//evil.example/path')).toBeNull()
    expect(sanitizeNextPath(null)).toBeNull()
  })

  it('maps common auth errors to Portuguese messages', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' })).toBe(
      'Email ou senha incorretos.',
    )
    expect(mapAuthError({ message: 'User already registered' })).toBe(
      'Este email já está cadastrado.',
    )
    expect(mapAuthError({ message: 'OAuth provider returned an error' })).toBe(
      'Não foi possível entrar com Google. Tente novamente.',
    )
  })
})

describe('ensureUserProfile', () => {
  it('returns existing profile without overwriting role', async () => {
    const existingProfile = {
      id: 'user-1',
      role: 'READER',
      full_name: 'Existing Reader',
      tax_id: '11144477735',
      cpf_cnpj: '11144477735',
    }
    const { supabase, spies } = makeSupabaseMock({ selectData: existingProfile })

    const result = await ensureUserProfile(
      makeUser(),
      { role: 'CLIENT', fullName: 'New Name', taxId: '52998224725' },
      { supabase: supabase as never },
    )

    expect(result).toEqual({
      profile: existingProfile,
      createdOrUpdated: false,
    })
    expect(spies.upsert).not.toHaveBeenCalled()
    expect(spies.update).not.toHaveBeenCalled()
  })

  it('fills missing fields on an existing minimal profile without overwriting role', async () => {
    const existingProfile = {
      id: 'user-1',
      role: 'CLIENT',
      full_name: 'Task User',
      avatar_url: null,
      sexo: null,
      tax_id: null,
      cpf_cnpj: null,
      cellphone: null,
    }
    const updatedProfile = {
      ...existingProfile,
      sexo: 'feminino',
      tax_id: '52998224725',
      cpf_cnpj: '52998224725',
      cellphone: '11999999999',
    }
    const { supabase, spies } = makeSupabaseMock({
      selectData: existingProfile,
      updateData: updatedProfile,
    })

    const result = await ensureUserProfile(
      makeUser(),
      {
        role: 'READER',
        sexo: 'feminino',
        taxId: '52998224725',
        cpfCnpj: '52998224725',
        cellphone: '11999999999',
      },
      { supabase: supabase as never },
    )

    expect(result).toEqual({
      profile: updatedProfile,
      createdOrUpdated: true,
    })
    expect(spies.update).toHaveBeenCalledWith({
      sexo: 'feminino',
      tax_id: '52998224725',
      cpf_cnpj: '52998224725',
      cellphone: '11999999999',
    })
    expect(spies.upsert).not.toHaveBeenCalled()
  })

  it('creates a CLIENT profile when none exists', async () => {
    const upsertedProfile = {
      id: 'user-1',
      role: 'CLIENT',
      full_name: 'Task User',
      avatar_url: 'https://example.com/avatar.png',
      sexo: null,
      tax_id: null,
      cpf_cnpj: null,
      cellphone: null,
    }
    const { supabase, spies } = makeSupabaseMock({
      selectData: null,
      upsertData: upsertedProfile,
    })

    const result = await ensureUserProfile(
      makeUser({
        user_metadata: {
          name: 'Task User',
          picture: 'https://example.com/avatar.png',
        },
      }),
      { role: 'CLIENT' },
      { supabase: supabase as never },
    )

    expect(result).toEqual({
      profile: upsertedProfile,
      createdOrUpdated: true,
    })
    expect(spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        role: 'CLIENT',
        full_name: 'Task User',
        avatar_url: 'https://example.com/avatar.png',
      }),
    )
  })

  it('throws when the profile upsert fails', async () => {
    const upsertError = { message: 'new row violates row-level security policy', code: '42501' }
    const { supabase } = makeSupabaseMock({
      selectData: null,
      upsertError,
    })

    await expect(
      ensureUserProfile(makeUser(), { role: 'CLIENT' }, { supabase: supabase as never }),
    ).rejects.toBe(upsertError)
  })
})
