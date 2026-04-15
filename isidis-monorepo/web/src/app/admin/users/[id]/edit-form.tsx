
import { useState } from 'react';
import { adminUpdateUserProfile } from '@/app/actions/admin-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AdminUserEditForm({ user }: { user: any }) {
    const [loading, setLoading] = useState(false);

    async function action(formData: FormData) {
        setLoading(true);
        const data = {
            full_name: formData.get('full_name') as string,
            role: formData.get('role') as string,
            bio: formData.get('bio') as string,
            email: formData.get('email') as string,
            cellphone: formData.get('cellphone') as string,
            tax_id: formData.get('tax_id') as string,
            cpf_cnpj: formData.get('cpf_cnpj') as string,
            pix_key_type: formData.get('pix_key_type') as string,
            pix_key: formData.get('pix_key') as string,
        };

        const res = await adminUpdateUserProfile(user.id, data);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Usuário atualizado com sucesso!");
        }
        setLoading(false);
    }

    return (
        <form action={action} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email de Login</Label>
                <Input id="email" name="email" defaultValue={user.email} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input id="full_name" name="full_name" defaultValue={user.full_name} required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="role">Nível de Acesso (Role)</Label>
                <Select name="role" defaultValue={user.role}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um nível" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CLIENT">Cliente (Client)</SelectItem>
                        <SelectItem value="READER">Cartomante (Reader)</SelectItem>
                        <SelectItem value="ADMIN">Administrador (Admin)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea id="bio" name="bio" defaultValue={user.bio} className="min-h-[100px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="cellphone">Celular</Label>
                    <Input id="cellphone" name="cellphone" defaultValue={user.cellphone} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cpf_cnpj">CPF/CNPJ (Cartomante)</Label>
                    <Input id="cpf_cnpj" name="cpf_cnpj" defaultValue={user.cpf_cnpj} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID (Cliente/Geral)</Label>
                <Input id="tax_id" name="tax_id" defaultValue={user.tax_id} />
                <p className="text-xs text-muted-foreground">Documento alternativo caso registrado como cliente e depois como cartomante.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                    <Label htmlFor="pix_key_type">Tipo de Chave PIX</Label>
                    <Select name="pix_key_type" defaultValue={user.pix_key_type || ""}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CPF">CPF</SelectItem>
                            <SelectItem value="CNPJ">CNPJ</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="PHONE">Telefone</SelectItem>
                            <SelectItem value="RANDOM">Chave Aleatória</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pix_key">Chave PIX</Label>
                    <Input id="pix_key" name="pix_key" defaultValue={user.pix_key} />
                </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
        </form>
    );
}
