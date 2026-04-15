-- Drop and recreate the notifications type check constraint to include all existing and new types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    -- Original types
    'ORDER_NEW',
    'ORDER_STATUS',
    'REVIEW_NEW',
    'WITHDRAWAL_UPDATE',
    'SYSTEM',
    'ADMIN_GIG_PENDING',
    'ADMIN_USER_PENDING',
    -- New types mapped
    'ORDER_CREATED',
    'ORDER_PAID',
    'ORDER_DELIVERED',
    'ORDER_CANCELED',
    'NEW_MESSAGE',
    'SYSTEM_ALERT',
    'GIG_APPROVED',
    'GIG_REJECTED',
    'USER_APPROVED',
    'USER_REJECTED',
    'SUBSCRIPTION_DUE'
  )
);
