import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Save, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { SPECIALTY_MAP } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'

const PIX_TYPES = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'RANDOM', label: 'Aleatória' },
]

export function ReaderProfileEditPage() {
  const navigate = useNavigate()
  const { profile, signOut, refreshProfile } = useAuth()

  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [tagline, setTagline] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [cellphone, setCellphone] = useState('')
  const [taxId, setTaxId] = useState('')
  const [pixKeyType, setPixKeyType] = useState('CPF')
  const [pixKey, setPixKey] = useState('')
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState('')
  const [maxSimultaneous, setMaxSimultaneous] = useState('')
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setBio(profile.bio ?? '')
      setTagline(profile.tagline ?? '')
      setSpecialties(profile.specialties ?? [])
      setCellphone(profile.cellphone ?? '')
      setTaxId(profile.tax_id ?? '')
      setPixKeyType(profile.pix_key_type ?? 'CPF')
      setPixKey(profile.pix_key ?? '')
      setMaxOrdersPerDay(profile.max_orders_per_day != null ? String(profile.max_orders_per_day) : '')
      setMaxSimultaneous(profile.max_simultaneous_orders != null ? String(profile.max_simultaneous_orders) : '')
    }
  }, [profile])

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('O nome é obrigatório')
      return
    }
    setLoading(true)
    try {
      await api.patch('/me', {
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        tagline: tagline.trim() || null,
        specialties,
        cellphone: cellphone.trim() || null,
        tax_id: taxId.trim() || null,
        pix_key_type: pixKey.trim() ? pixKeyType : null,
        pix_key: pixKey.trim() || null,
        max_orders_per_day: maxOrdersPerDay ? parseInt(maxOrdersPerDay) : null,
        max_simultaneous_orders: maxSimultaneous ? parseInt(maxSimultaneous) : null,
      })
      await refreshProfile()
      toast.success('Perfil atualizado!')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="animate-fade-in pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-6">
        <h1 className="font-display text-2xl font-bold">Meu Perfil</h1>
      </div>

      <div className="px-5 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative">
            <Avatar src={profile?.avatar_url} name={profile?.full_name} size="xl" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background">
              <Camera size={12} className="text-white" />
            </div>
          </div>
          {profile?.rating_average != null && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-gold">★</span>
              <span className="font-medium">{profile.rating_average.toFixed(1)}</span>
              {profile.reviews_count != null && (
                <span className="text-muted-foreground">({profile.reviews_count} avaliações)</span>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Apresentação */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Apresentação
          </h2>
          <Input
            label="Nome completo *"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
          <Input
            label="Tagline"
            placeholder="Uma frase que define seu trabalho..."
            value={tagline}
            onChange={e => setTagline(e.target.value)}
          />
          <Textarea
            label="Bio"
            placeholder="Conte sobre você, sua jornada espiritual, sua experiência..."
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="min-h-28"
          />
        </section>

        {/* Especialidades */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Especialidades
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SPECIALTY_MAP).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleSpecialty(key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  specialties.includes(key)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <Separator />

        {/* Dados pessoais */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dados pessoais
          </h2>
          <Input
            label="Celular"
            type="tel"
            placeholder="+55 11 99999-9999"
            value={cellphone}
            onChange={e => setCellphone(e.target.value)}
          />
          <Input
            label="CPF / CNPJ"
            placeholder="Apenas números"
            value={taxId}
            onChange={e => setTaxId(e.target.value)}
          />
        </section>

        <Separator />

        {/* Chave PIX */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chave PIX (para saques)
          </h2>
          <div className="flex flex-wrap gap-2">
            {PIX_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPixKeyType(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  pixKeyType === t.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Input
            label="Chave PIX"
            placeholder={
              pixKeyType === 'CPF' ? '000.000.000-00' :
              pixKeyType === 'CNPJ' ? '00.000.000/0001-00' :
              pixKeyType === 'EMAIL' ? 'seu@email.com' :
              pixKeyType === 'PHONE' ? '+55 11 99999-9999' :
              'Chave aleatória'
            }
            value={pixKey}
            onChange={e => setPixKey(e.target.value)}
          />
        </section>

        <Separator />

        {/* Capacidade */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Capacidade de atendimento
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Defina limites para não se sobrecarregar
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pedidos/dia"
              type="number"
              placeholder="10"
              min="1"
              value={maxOrdersPerDay}
              onChange={e => setMaxOrdersPerDay(e.target.value)}
            />
            <Input
              label="Simultâneos"
              type="number"
              placeholder="5"
              min="1"
              value={maxSimultaneous}
              onChange={e => setMaxSimultaneous(e.target.value)}
            />
          </div>
        </section>

        <Button className="w-full" size="lg" loading={loading} onClick={handleSave}>
          <Save size={16} />
          Salvar alterações
        </Button>

        <Button
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
          loading={signingOut}
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
