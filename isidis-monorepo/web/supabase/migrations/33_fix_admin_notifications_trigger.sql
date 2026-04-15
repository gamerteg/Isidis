-- Fix for notify_admin_user_verification trigger function
-- The original function tried to access NEW.email which doesn't exist on the profiles table

CREATE OR REPLACE FUNCTION notify_admin_user_verification() RETURNS trigger AS $$
BEGIN
  -- Handle INSERT (OLD is null) or UPDATE (status changed)
  IF (TG_OP = 'INSERT' AND NEW.verification_status = 'PENDING')
     OR (TG_OP = 'UPDATE' AND NEW.verification_status = 'PENDING' AND OLD.verification_status IS DISTINCT FROM NEW.verification_status)
     OR (TG_OP = 'UPDATE' AND NEW.role = 'TAROLOGA' AND OLD.role IS DISTINCT FROM NEW.role AND NEW.verification_status = 'PENDING') THEN
    
    PERFORM notify_admins(
      'ADMIN_USER_PENDING',
      'Nova Aprovação de Usuário 👤',
      'O usuário ' || COALESCE(NEW.full_name, 'Sem Nome') || ' solicitou verificação como cartomante.',
      '/admin/users'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
