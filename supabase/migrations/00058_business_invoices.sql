CREATE TABLE IF NOT EXISTS business_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  shopier_product_id TEXT, shopier_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE business_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can read their own invoices"
  ON business_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_invoices.business_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can insert their own invoices"
  ON business_invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_invoices.business_id
      AND owner_id = auth.uid()
    )
  );
