CREATE TABLE IF NOT EXISTS lean_canvas (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE lean_canvas ENABLE ROW LEVEL SECURITY;

-- Allow read/write for service role (admin API)
CREATE POLICY "Service role can manage lean_canvas"
  ON lean_canvas
  FOR ALL
  USING (true)
  WITH CHECK (true);
