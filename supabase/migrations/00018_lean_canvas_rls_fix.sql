-- 00017's policy said "service role" but USING (true) grants EVERY role — including anon —
-- full read/write on the business strategy canvas (verified live with the publishable key).
-- Service role bypasses RLS entirely, so the correct setup is RLS enabled with NO policies:
-- anon/authenticated get denied, the admin API (service role) keeps working.
DROP POLICY IF EXISTS "Service role can manage lean_canvas" ON lean_canvas;
