-- Migration: 36_get_admin_financial_stats.sql
-- Purpose: Efficiently aggregate financial data for the admin dashboard

CREATE OR REPLACE FUNCTION get_admin_financial_stats()
RETURNS JSON AS $$
DECLARE
    total_revenue BIGINT;
    platform_fee BIGINT;
    total_repasse BIGINT;
    total_withdrawn BIGINT;
    total_credited BIGINT;
    pending_repasse BIGINT;
BEGIN
    -- 1. Aggregate from orders table (PAID, DELIVERED, COMPLETED)
    SELECT 
        COALESCE(SUM(amount_total), 0),
        COALESCE(SUM(amount_platform_fee), 0),
        COALESCE(SUM(amount_reader_net), 0)
    INTO 
        total_revenue,
        platform_fee,
        total_repasse
    FROM orders
    WHERE status IN ('PAID', 'DELIVERED', 'COMPLETED');

    -- 2. Aggregate from transactions table for withdrawals
    SELECT 
        COALESCE(SUM(ABS(amount)), 0)
    INTO 
        total_withdrawn
    FROM transactions
    WHERE type = 'WITHDRAWAL' AND status = 'COMPLETED';

    -- 3. Aggregate from transactions table for credits
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO 
        total_credited
    FROM transactions
    WHERE type = 'SALE_CREDIT' AND status = 'COMPLETED';

    -- 4. Calculate pending repasse
    pending_repasse := GREATEST(0, total_credited - total_withdrawn);

    -- 5. Return as JSON
    RETURN json_build_object(
        'total_revenue', total_revenue,
        'platform_fee', platform_fee,
        'total_repasse', total_repasse,
        'total_withdrawn', total_withdrawn,
        'pending_repasse', pending_repasse
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
