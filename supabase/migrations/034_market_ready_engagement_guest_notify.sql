create policy "anonymous can create stock notifications" on public.stock_notifications for insert to anon
with check (user_id is null and length(trim(email)) between 5 and 320 and status = 'waiting');
