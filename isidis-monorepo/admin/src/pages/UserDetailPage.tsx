import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Wallet, User, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getUserDetail, updateUser, suspendUser, activateUser, changeRole,
  getUserOrders, getUserWalletStats, creditBalance, type AdminUser, type UserOrder, type WalletStats,
} from '@/services/users'
import { formatCurrency, formatDate, pixKeyTypeLabel } from '@/lib/utils'

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [orders, setOrders] = useState<UserOrder[]>([])
  const [wallet, setWallet] = useState<WalletStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ action: string; label: string } | null>(null)

  // Editable fields
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [socialName, setSocialName] = useState('')
  const [cellphone, setCellphone] = useState('')
  const [taxId, setTaxId] = useState('')
  const [pixKeyType, setPixKeyType] = useState('')
  const [pixKey, setPixKey] = useState('')

  // Credit balance dialog
  const [creditDialog, setCreditDialog] = useState(false)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDescription, setCreditDescription] = useState('')
  const [crediting, setCrediting] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getUserDetail(id),
      getUserOrders(id),
    ]).then(([u, o]) => {
      setUser(u)
      setOrders(o)
      setFullName(u?.full_name ?? '')
      setBio(u?.bio ?? '')
      setSocialName(u?.social_name ?? '')
      setCellphone(u?.cellphone ?? '')
      setTaxId(u?.tax_id ?? '')
      setPixKeyType(u?.pix_key_type ?? '')
      setPixKey(u?.pix_key ?? '')

      if (u?.role === 'READER') {
        getUserWalletStats(id).then(setWallet)
      }
    }).finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!user || !id) return
    setSaving(true)
    try {
      const updates = {
        full_name: fullName,
        bio,
        social_name: socialName,
        cellphone,
        tax_id: taxId,
        pix_key_type: pixKeyType,
        pix_key: pixKey,
      }
      await updateUser(id, updates)
      toast.success('Perfil atualizado.')
      setUser(u => u ? { ...u, ...updates } : u)
    } catch {
      toast.error('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreditBalance = async () => {
    if (!id || !creditAmount || !creditDescription) return
    setCrediting(true)
    try {
      const amountCents = Math.round(parseFloat(creditAmount.replace(',', '.')) * 100)
      await creditBalance(id, amountCents, creditDescription)
      toast.success('Saldo creditado com sucesso.')
      setCreditDialog(false)
      setCreditAmount('')
      setCreditDescription('')
      // Refresh wallet
      getUserWalletStats(id).then(setWallet)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao creditar saldo.')
    } finally {
      setCrediting(false)
    }
  }

  const handleAction = async (action: string) => {
    if (!id) return
    setConfirmDialog(null)
    try {
      if (action === 'suspend') { await suspendUser(id); toast.success('Usuário suspenso.') }
      else if (action === 'activate') { await activateUser(id); toast.success('Usuário reativado.') }
      else if (action === 'make_admin') { await changeRole(id, 'ADMIN'); toast.success('Usuário promovido a Admin.') }
      else if (action === 'make_client') { await changeRole(id, 'CLIENT'); toast.success('Role alterado para Cliente.') }
      const updated = await getUserDetail(id)
      setUser(updated)
    } catch {
      toast.error('Erro ao executar ação.')
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>
  if (!user) return <div className="p-8 text-muted-foreground">Usuário não encontrado.</div>

  const isReader = user.role === 'READER'
  const statusColors: Record<string, string> = {
    APPROVED: 'text-green-400',
    PENDING: 'text-amber-400',
    REJECTED: 'text-red-400',
    SUSPENDED: 'text-red-400',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/users"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {(user.full_name ?? user.email).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.full_name ?? '—'}</h1>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </div>
        {user.verification_status && (
          <Badge variant={user.verification_status === 'APPROVED' ? 'success' : user.verification_status === 'SUSPENDED' ? 'destructive' : 'warning'}>
            {user.verification_status}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick actions sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Ações Rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {user.verification_status !== 'SUSPENDED' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setConfirmDialog({ action: 'suspend', label: 'Suspender esta conta?' })}
                >
                  Suspender Conta
                </Button>
              )}
              {user.verification_status === 'SUSPENDED' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-green-400 border-green-500/30 hover:bg-green-500/10"
                  onClick={() => setConfirmDialog({ action: 'activate', label: 'Reativar esta conta?' })}
                >
                  Reativar Conta
                </Button>
              )}
              {user.role !== 'ADMIN' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setConfirmDialog({ action: 'make_admin', label: 'Promover a Administrador?' })}
                >
                  Tornar Admin
                </Button>
              )}
              {user.role !== 'CLIENT' && user.role !== 'ADMIN' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setConfirmDialog({ action: 'make_client', label: 'Mudar role para Cliente?' })}
                >
                  Tornar Cliente
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Role: </span><span>{user.role}</span></div>
              <div><span className="text-muted-foreground">Cadastro: </span><span>{formatDate(user.created_at)}</span></div>
              {user.cellphone && <div><span className="text-muted-foreground">Celular: </span><span>{user.cellphone}</span></div>}
              {user.tax_id && <div><span className="text-muted-foreground">CPF: </span><span className="font-mono">{user.tax_id}</span></div>}
              {user.pix_key && (
                <div>
                  <span className="text-muted-foreground">PIX: </span>
                  <span className="font-mono text-xs">{user.pix_key_type}: {user.pix_key}</span>
                </div>
              )}
              {user.rating_average != null && (
                <div><span className="text-muted-foreground">Rating: </span><span>⭐ {user.rating_average?.toFixed(1)} ({user.reviews_count} avaliações)</span></div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile"><User className="w-4 h-4 mr-1" />Perfil</TabsTrigger>
              <TabsTrigger value="orders"><ShoppingCart className="w-4 h-4 mr-1" />Pedidos ({orders.length})</TabsTrigger>
              {isReader && <TabsTrigger value="wallet"><Wallet className="w-4 h-4 mr-1" />Carteira</TabsTrigger>}
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Social (opcional)</Label>
                      <Input value={socialName} onChange={e => setSocialName(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CPF / CNPJ</Label>
                      <Input value={taxId} onChange={e => setTaxId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp / Celular</Label>
                      <Input value={cellphone} onChange={e => setCellphone(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Chave PIX</Label>
                      <Select value={pixKeyType} onValueChange={setPixKeyType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPF">CPF</SelectItem>
                          <SelectItem value="CNPJ">CNPJ</SelectItem>
                          <SelectItem value="EMAIL">E-mail</SelectItem>
                          <SelectItem value="PHONE">Telefone</SelectItem>
                          <SelectItem value="RANDOM">Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Chave PIX</Label>
                      <Input value={pixKey} onChange={e => setPixKey(e.target.value)} />
                    </div>
                  </div>

                  {isReader && (
                    <div className="space-y-2">
                      <Label>Biografia</Label>
                      <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  )}
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar Alterações'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Outra Parte</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Disputa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Sem pedidos.
                          </TableCell>
                        </TableRow>
                      ) : orders.map(o => (
                        <TableRow key={o.id}>
                          <TableCell>
                            <Link to={`/orders/${o.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                              {o.gig_title}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {o.role_in_order === 'client' ? '→' : '←'} {o.other_party_name}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(o.amount_total)}</TableCell>
                          <TableCell>
                            <Badge variant={o.status === 'COMPLETED' ? 'success' : o.status === 'CANCELED' ? 'destructive' : 'info'} className="text-[10px]">
                              {o.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                          <TableCell>
                            {o.has_dispute && <AlertTriangle className="w-4 h-4 text-red-400" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {isReader && (
              <TabsContent value="wallet">
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader><CardTitle className="text-sm text-muted-foreground">Disponível</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(wallet?.available ?? 0)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-sm text-muted-foreground">Em Hold (48h)</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-amber-400">{formatCurrency(wallet?.pending ?? 0)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-sm text-muted-foreground">Total Sacado</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-blue-400">{formatCurrency(wallet?.total_withdrawn ?? 0)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-sm">Ação Manual de Saldo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Use esta ferramenta para creditar valores manualmente na carteira da cartomante (ex: reembolsos, bônus, correções).
                      </p>
                      <Button onClick={() => setCreditDialog(true)}>
                        <Wallet className="w-4 h-4 mr-2" />
                        Liberar Saldo Manualmente
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Credit Balance Dialog */}
      <Dialog open={creditDialog} onOpenChange={setCreditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Liberar Saldo Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                placeholder="0,00"
                value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo / Descrição</Label>
              <Input
                placeholder="Ex: Correção de repasse pedido #123"
                value={creditDescription}
                onChange={e => setCreditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreditBalance} disabled={crediting || !creditAmount || !creditDescription}>
              {crediting ? 'Creditando...' : 'Confirmar Crédito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmDialog?.label}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação pode ser revertida depois.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            <Button
              variant={confirmDialog?.action === 'suspend' ? 'destructive' : 'default'}
              onClick={() => confirmDialog && handleAction(confirmDialog.action)}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
