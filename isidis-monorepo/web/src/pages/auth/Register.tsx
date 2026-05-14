import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sanitizeNextPath, signUpWithPassword } from '@/lib/auth/service'
import { validateCPF } from '@/lib/utils'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Check, Eye, EyeOff, Loader2, UserPlus, X } from 'lucide-react'
import { PageSection } from '@/components/layout/PageSection'

type FormState = {
    fullName: string
    sexo: string
    email: string
    password: string
    confirmPassword: string
    cpf: string
    cellphone: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const initialFormState: FormState = {
    fullName: '',
    sexo: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    cellphone: '',
}

export default function RegisterPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const next = sanitizeNextPath(searchParams.get('next'))
    const loginPath = next ? `/login?next=${encodeURIComponent(next)}` : '/login'
    const [formData, setFormData] = useState<FormState>(initialFormState)
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const passwordValidation = validatePassword(formData.password)
    const passwordsMatch = formData.password === formData.confirmPassword
    const showPasswordHints = formData.password.length > 0
    const showConfirmError = formData.confirmPassword.length > 0 && !passwordsMatch

    const handleInputChange = (field: keyof FormState, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (fieldErrors[field]) {
            setFieldErrors(prev => {
                const nextErrors = { ...prev }
                delete nextErrors[field]
                return nextErrors
            })
        }
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormError(null)

        const validationErrors = validateForm(formData, passwordValidation.isValid, passwordsMatch)
        if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors)
            return
        }

        setIsLoading(true)
        const result = await signUpWithPassword({
            fullName: formData.fullName.trim(),
            sexo: formData.sexo,
            email: formData.email.trim(),
            password: formData.password,
            cpf: formData.cpf,
            cellphone: formData.cellphone,
            next,
        })

        if (result.ok) {
            navigate(result.destination ?? '/register/confirm', { replace: true })
            return
        }

        setFormError(result.error)
        setIsLoading(false)
    }

    return (
        <PageSection padding="none" withOrbs withShootingStars className="min-h-screen flex items-center justify-center overflow-y-auto pb-safe">
            <div className="w-full max-w-2xl relative z-10 py-8">
                <form onSubmit={handleSubmit} className="border-shine bg-card/30 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/5 border border-primary/10 mb-5 animate-float">
                            <img src="/logo.png" alt="Isidis Logo" className="w-14 h-14 object-contain" />
                        </div>
                        <h1 className="font-display text-3xl font-light mb-3">Criar conta</h1>
                        <p className="text-muted-foreground">Cadastre-se para consultar cartomantes no Isidis.</p>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="fullName">Nome completo</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={event => handleInputChange('fullName', event.target.value)}
                                    placeholder="Seu nome"
                                    disabled={isLoading}
                                    required
                                />
                                {fieldErrors.fullName && <FieldError>{fieldErrors.fullName}</FieldError>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sexo">Sexo</Label>
                                <select
                                    id="sexo"
                                    name="sexo"
                                    value={formData.sexo}
                                    onChange={event => handleInputChange('sexo', event.target.value)}
                                    disabled={isLoading}
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="" disabled>Selecione...</option>
                                    <option value="masculino">Masculino</option>
                                    <option value="feminino">Feminino</option>
                                    <option value="nao_binario">Não binário</option>
                                    <option value="prefiro_nao_informar">Prefiro não informar</option>
                                </select>
                                {fieldErrors.sexo && <FieldError>{fieldErrors.sexo}</FieldError>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={event => handleInputChange('email', event.target.value)}
                                    placeholder="seu@email.com"
                                    disabled={isLoading}
                                    required
                                />
                                {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cpf">CPF</Label>
                                <Input
                                    id="cpf"
                                    name="cpf"
                                    value={formData.cpf}
                                    onChange={event => handleInputChange('cpf', formatCpf(event.target.value))}
                                    placeholder="000.000.000-00"
                                    disabled={isLoading}
                                    required
                                    className={fieldErrors.cpf ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                />
                                {fieldErrors.cpf && <FieldError>{fieldErrors.cpf}</FieldError>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cellphone">Celular</Label>
                                <Input
                                    id="cellphone"
                                    name="cellphone"
                                    value={formData.cellphone}
                                    onChange={event => handleInputChange('cellphone', formatPhone(event.target.value))}
                                    placeholder="(11) 99999-9999"
                                    disabled={isLoading}
                                    required
                                />
                                {fieldErrors.cellphone && <FieldError>{fieldErrors.cellphone}</FieldError>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={event => handleInputChange('password', event.target.value)}
                                        placeholder="Crie uma senha segura"
                                        disabled={isLoading}
                                        required
                                        className={`pr-10 ${showPasswordHints && !passwordValidation.isValid ? 'border-red-500/50 focus-visible:ring-red-500' : ''}`}
                                    />
                                    <PasswordToggle
                                        active={showPassword}
                                        disabled={isLoading}
                                        onClick={() => setShowPassword(prev => !prev)}
                                    />
                                </div>
                                {showPasswordHints && <PasswordHints validation={passwordValidation} />}
                                {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={event => handleInputChange('confirmPassword', event.target.value)}
                                        placeholder="Repita sua senha"
                                        disabled={isLoading}
                                        required
                                        className={`pr-10 ${showConfirmError ? 'border-red-500/50 focus-visible:ring-red-500' : ''}`}
                                    />
                                    <PasswordToggle
                                        active={showConfirmPassword}
                                        disabled={isLoading}
                                        onClick={() => setShowConfirmPassword(prev => !prev)}
                                    />
                                </div>
                                {showConfirmError && <FieldError>As senhas não coincidem.</FieldError>}
                                {fieldErrors.confirmPassword && <FieldError>{fieldErrors.confirmPassword}</FieldError>}
                            </div>
                        </div>

                        {formError && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-shake">
                                {formError}
                            </div>
                        )}

                        <Button type="submit" className="aurora border-shine w-full py-6 text-base font-bold text-white hover:opacity-90" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <UserPlus className="mr-2 w-4 h-4" />}
                            {isLoading ? 'Criando conta...' : 'Criar conta'}
                        </Button>
                    </div>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    Já tem conta?{' '}
                    <Link to={loginPath} className="text-primary font-semibold hover:underline">
                        Entrar
                    </Link>
                </p>
            </div>
        </PageSection>
    )
}

function FieldError({ children }: { children: string }) {
    return (
        <p className="flex items-center gap-1.5 text-xs text-red-500 animate-fade-in">
            <AlertCircle className="w-3 h-3" />
            {children}
        </p>
    )
}

function PasswordToggle({
    active,
    disabled,
    onClick,
}: {
    active: boolean
    disabled: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label={active ? 'Ocultar senha' : 'Mostrar senha'}
        >
            {active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
    )
}

function PasswordHints({ validation }: { validation: ReturnType<typeof validatePassword> }) {
    return (
        <div className="space-y-1 mt-2 p-3 bg-muted/50 rounded-lg text-xs transition-all animate-fade-in-down">
            <p className="font-semibold text-muted-foreground mb-2">A senha deve conter:</p>
            <Hint isValid={validation.checks.minLength}>No mínimo 8 caracteres</Hint>
            <Hint isValid={validation.checks.hasUpperCase}>Pelo menos uma letra maiúscula</Hint>
            <Hint isValid={validation.checks.hasNumber}>Pelo menos um número</Hint>
            <Hint isValid={validation.checks.hasSpecialChar}>Pelo menos um caractere especial</Hint>
        </div>
    )
}

function Hint({ children, isValid }: { children: string; isValid: boolean }) {
    return (
        <div className={`flex items-center gap-2 ${isValid ? 'text-green-500' : 'text-red-500'}`}>
            {isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            <span>{children}</span>
        </div>
    )
}

function validateForm(
    formData: FormState,
    isPasswordValid: boolean,
    passwordsMatch: boolean,
) {
    const errors: FieldErrors = {}

    if (!formData.fullName.trim()) errors.fullName = 'Informe seu nome completo.'
    if (!formData.sexo) errors.sexo = 'Selecione uma opção.'
    if (!formData.email.trim()) errors.email = 'Informe seu email.'
    if (!formData.cpf.trim()) errors.cpf = 'Informe seu CPF.'
    if (!formData.cellphone.trim()) errors.cellphone = 'Informe seu celular.'
    if (!formData.password) errors.password = 'Informe uma senha.'
    if (!formData.confirmPassword) errors.confirmPassword = 'Confirme sua senha.'

    if (formData.cpf && !validateCPF(formData.cpf)) {
        errors.cpf = 'O CPF informado é inválido.'
    }

    if (formData.password && !isPasswordValid) {
        errors.password = 'A senha não atende aos requisitos mínimos.'
    }

    if (formData.confirmPassword && !passwordsMatch) {
        errors.confirmPassword = 'As senhas não coincidem.'
    }

    return errors
}

function validatePassword(password: string) {
    const minLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password)

    return {
        isValid: minLength && hasUpperCase && hasNumber && hasSpecialChar,
        checks: {
            minLength,
            hasUpperCase,
            hasNumber,
            hasSpecialChar,
        },
    }
}

function formatCpf(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits.length ? `(${digits}` : ''
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}
