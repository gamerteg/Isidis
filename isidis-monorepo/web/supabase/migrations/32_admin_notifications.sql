-- Add ADMIN_PENDING_APPROVAL to notification types
DO $$ 
BEGIN
    ALTER TABLE public.notifications 
    DROP CONSTRAINT IF EXISTS notifications_type_check;
    
    ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('ORDER_NEW', 'ORDER_STATUS', 'REVIEW_NEW', 'WITHDRAWAL_UPDATE', 'SYSTEM', 'ADMIN_GIG_PENDING', 'ADMIN_USER_PENDING'));
END $$;

-- Function to notify all admins
CREATE OR REPLACE FUNCTION notify_admins(
  p_type text,
  p_title text,
  p_message text,
  p_link text
) RETURNS void AS $$
DECLARE
  admin_id uuid;
BEGIN
  FOR admin_id IN (SELECT id FROM public.profiles WHERE role = 'ADMIN') LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (admin_id, p_type, p_title, p_message, p_link);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for New Pending Gigs (INSERT)
CREATE OR REPLACE FUNCTION notify_admin_new_gig_insert() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'PENDING' THEN
    PERFORM notify_admins(
      'ADMIN_GIG_PENDING',
      'Novo Gig Pendente ✨',
      'Um novo gig foi criado e aguarda aprovação.',
      '/admin/approvals/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_gig_created_admin_notify ON public.gigs;
CREATE TRIGGER on_gig_created_admin_notify_insert
  AFTER INSERT ON public.gigs
  FOR EACH ROW
  EXECUTE PROCEDURE notify_admin_new_gig_insert();

-- Trigger for Pending Gigs (UPDATE)
CREATE OR REPLACE FUNCTION notify_admin_gig_update() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'PENDING' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM notify_admins(
      'ADMIN_GIG_PENDING',
      'Gig Reaberto para Aprovação ✨',
      'Um gig foi editado e requer nova aprovação.',
      '/admin/approvals/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_gig_updated_admin_notify ON public.gigs;
CREATE TRIGGER on_gig_updated_admin_notify
  AFTER UPDATE OF status ON public.gigs
  FOR EACH ROW
  EXECUTE PROCEDURE notify_admin_gig_update();

-- Trigger for User/Tarologa Verification Status Change
CREATE OR REPLACE FUNCTION notify_admin_user_verification() RETURNS trigger AS $$
BEGIN
  -- Handle INSERT (OLD is null) or UPDATE (status changed)
  IF (TG_OP = 'INSERT' AND NEW.verification_status = 'PENDING')
     OR (TG_OP = 'UPDATE' AND NEW.verification_status = 'PENDING' AND OLD.verification_status IS DISTINCT FROM NEW.verification_status)
     OR (TG_OP = 'UPDATE' AND NEW.role = 'TAROLOGA' AND OLD.role IS DISTINCT FROM NEW.role AND NEW.verification_status = 'PENDING') THEN
    
    PERFORM notify_admins(
      'ADMIN_USER_PENDING',
      'Nova Aprovação de Usuário 👤',
      'O usuário ' || COALESCE(NEW.full_name, NEW.email, 'Sem Nome') || ' solicitou verificação como cartomante.',
      '/admin/users'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_updated_admin_notify ON public.profiles;
CREATE TRIGGER on_profile_updated_admin_notify
  AFTER INSERT OR UPDATE OF verification_status, role ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE notify_admin_user_verification();
