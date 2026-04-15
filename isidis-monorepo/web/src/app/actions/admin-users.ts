

import { supabaseAdmin } from "@/lib/supabase/admin";


export async function adminUpdateUserProfile(userId: string, data: {
    full_name?: string,
    role?: string,
    bio?: string,
    email?: string,
    cellphone?: string,
    tax_id?: string,
    cpf_cnpj?: string,
    pix_key_type?: string,
    pix_key?: string
}) {
    try {
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name: data.full_name,
                role: data.role,
                bio: data.bio,
                cellphone: data.cellphone,
                tax_id: data.tax_id,
                cpf_cnpj: data.cpf_cnpj,
                pix_key_type: data.pix_key_type,
                pix_key: data.pix_key
            })
            .eq('id', userId);

        if (profileError) throw profileError;

        // Update auth user data if changed
        const updateData: any = {
            user_metadata: {
                full_name: data.full_name,
                role: data.role
            }
        };

        if (data.email) {
            updateData.email = data.email;
        }

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
        if (authError) throw authError;

        
        

        return { success: true };
    } catch (error: any) {
        console.error("Error updating user:", error);
        return { error: error.message || "Failed to update user profile" };
    }
}
