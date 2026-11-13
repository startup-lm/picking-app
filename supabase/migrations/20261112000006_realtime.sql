-- 20261112000006_realtime.sql
-- Enable Supabase Realtime publication on orders and order_lines

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_lines REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders, public.order_lines;
