import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Save, Mail, Phone, Shield, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { Avatar } from '@/components/shared/Avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function ClientProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut, refreshProfile } = useAuth()

  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [cellphone, setCellphone] = useState(profile?.cellphone ?? '')
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setCellphone(profile.cellphone ?? '')
    }
  }, [profile])

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('O nome é obrigatório')
      return
    }
    setLoading(true)
    try {
      await api.patch('/me', {
        full_name: fullName.trim(),
        cellphone: cellphone.trim() || null,
      })
      await refreshProfile()
      toast.success('Perfil atualizado!')
      setEditing(false)
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
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Meu Perfil</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Edit3 size={14} />
            Editar
          </button>
        )}
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Avatar & name */}
        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar src={profile?.avatar_url} name={profile?.full_name} size="xl" />
          <div className="text-center">
            <h2 className="font-display text-xl font-bold">{profile?.full_name ?? '—'}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Edit form */}
        {editing ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="text-sm font-semibold">Editar informações</h2>
              <Input
                label="Nome completo"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
              <Input
                label="Celular"
                type="tel"
                placeholder="+55 11 99999-9999"
                value={cellphone}
                onChange={e => setCellphone(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditing(false)
                    setFullName(profile?.full_name ?? '')
                    setCellphone(profile?.cellphone ?? '')
                  }}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" loading={loading} onClick={handleSave}>
                  <Save size={14} />
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Info display */
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="text-sm">{user?.email ?? '—'}</p>
                </div>
              </div>
              {profile?.cellphone && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm">{profile.cellphone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Conta verificada</p>
                  <p className="text-sm">{user?.email_confirmed_at ? 'Sim ✓' : 'Não'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Links */}
        <div className="space-y-2">
          <button
            onClick={() => navigate('/pedidos')}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <span className="text-sm font-medium">Meus pedidos</span>
            <span className="text-xs text-muted-foreground">→</span>
          </button>
        </div>

        {/* Sign out */}
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
