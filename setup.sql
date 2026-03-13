-- ═══════════════════════════════════════════════════════════════
--  U1P ORDER PORTAL — Database Schema
--  Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- 1. Customers (replaces approved_customers.js)
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  company text NOT NULL,
  phone text,
  address text,
  password_hash text NOT NULL,
  is_admin boolean DEFAULT false,
  is_active boolean DEFAULT true,
  shipping_type text DEFAULT NULL,  -- FTL, CONTAINER_40, CONTAINER_20
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Products (replaces products_data.js)
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Product presentations / SKUs
CREATE TABLE presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL REFERENCES products(code) ON DELETE CASCADE,
  presentation text NOT NULL,
  sku text NOT NULL,
  weight_lbs numeric(10,2) DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_code, presentation)
);

-- 4. Default prices (replaces pricing_data.js)
CREATE TABLE default_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL REFERENCES products(code) ON DELETE CASCADE,
  presentation text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_code, presentation)
);

-- 5. Customer-specific price overrides (replaces prices/*.js files)
CREATE TABLE customer_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_code text NOT NULL REFERENCES products(code) ON DELETE CASCADE,
  presentation text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, product_code, presentation)
);

-- 6. Registration requests (replaces mailto registration)
CREATE TABLE registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  company text NOT NULL,
  phone text,
  address text,
  password_hash text NOT NULL,
  status text DEFAULT 'pending',  -- pending, approved, rejected
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- 7. Orders
CREATE SEQUENCE dispatch_number_seq START WITH 3101;

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_number integer UNIQUE DEFAULT nextval('dispatch_number_seq'),
  customer_id uuid REFERENCES customers(id),
  customer_name text,
  company text,
  email text,
  phone text,
  address text,
  notes text,
  status text DEFAULT 'pending',  -- pending, confirmed, shipped, completed, cancelled
  total numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Order line items
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_code text,
  product_name text,
  presentation text,
  sku text,
  qty integer NOT NULL,
  unit_price numeric(10,2),
  line_total numeric(10,2),
  weight_lbs numeric(10,2) DEFAULT NULL
);

-- ═══════════════════════════════════════════════════════════════
--  Row Level Security (RLS) — protect data access
-- ═══════════════════════════════════════════════════════════════

-- Disable RLS for now (we use application-level auth, not Supabase Auth)
-- This allows the anon key to read/write all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow anon access to all tables (application handles auth)
CREATE POLICY "Allow all access" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON presentations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON default_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON customer_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON registration_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
--  Seed initial admin user
--  Password: Admin123! (SHA-256 hashed)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO customers (email, name, company, phone, password_hash, is_admin)
VALUES (
  'ccolarusso@ultra1plus.com',
  'Carmine Colarusso',
  'Ultra1Plus',
  '',
  '3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121',
  true
);
