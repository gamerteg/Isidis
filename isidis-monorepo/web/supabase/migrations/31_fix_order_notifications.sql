-- Fix order notifications to handle PENDING_PAYMENT status
-- and notify reader when the order is PAID

-- Update trigger: New Order -> Notify Reader
create or replace function notify_new_order() returns trigger as $$
begin
  if NEW.status = 'PENDING_PAYMENT' then
    perform create_notification(
      NEW.reader_id,
      'ORDER_NEW',
      'Nova Tentativa de Compra 👀',
      'Um cliente iniciou um pedido, aguardando pagamento.',
      '/dashboard/cartomante/pedidos'
    );
  else
    perform create_notification(
      NEW.reader_id,
      'ORDER_NEW',
      'Novo Pedido Recebido! 🔮',
      'Você recebeu um novo pedido. Clique para ver os detalhes.',
      '/dashboard/cartomante/pedido/' || NEW.id
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Update trigger: Order Status Change -> Notify Client and Reader
create or replace function notify_order_status() returns trigger as $$
begin
  if OLD.status <> NEW.status then
    if NEW.status = 'DELIVERED' then
      perform create_notification(
        NEW.client_id,
        'ORDER_STATUS',
        'Sua leitura chegou! ✨',
        'Sua leitura de tarot foi entregue. Acesse para ver o resultado.',
        '/dashboard/pedido/' || NEW.id || '/leitura'
      );
    elsif NEW.status = 'CANCELED' then
      perform create_notification(
        NEW.client_id,
        'ORDER_STATUS',
        'Pedido Cancelado',
        'Seu pedido de leitura foi cancelado e o valor será estornado.',
        '/dashboard'
      );
       perform create_notification(
        NEW.reader_id,
        'ORDER_STATUS',
        'Pedido Cancelado',
        'Um pedido foi cancelado.',
        '/dashboard/cartomante/pedidos'
      );
    elsif NEW.status = 'PAID' then
      perform create_notification(
        NEW.reader_id,
        'ORDER_NEW',
        'Novo Pedido Pago! 🔮',
        'Um pedido foi confirmado e pago. Clique para ver os detalhes.',
        '/dashboard/cartomante/pedido/' || NEW.id
      );
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;
