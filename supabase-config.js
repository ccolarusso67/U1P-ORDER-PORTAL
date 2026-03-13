// ═══════════════════════════════════════════════════════════════
//  U1P ORDER PORTAL — Supabase Configuration & Helpers
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://tkntgaqdpmgaozevflpv.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_HONO8emXIRva-QioeDvafw_VSMPGcQV';

// Initialize Supabase client (loaded via CDN in HTML)
let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabase;
}

// ─────────────────────────────────────────────────
//  Auth helpers
// ─────────────────────────────────────────────────

// Simple SHA-256 hash for password (browser-native)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Login: verify email + password against customers table
async function supaLogin(email, password) {
  const db = getSupabase();
  const hash = await hashPassword(password);

  const { data, error } = await db
    .from('customers')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('password_hash', hash)
    .eq('is_active', true)
    .single();

  if (error || !data) return { success: false, error: 'Invalid email or password.' };
  return { success: true, customer: data };
}

// ─────────────────────────────────────────────────
//  Product helpers
// ─────────────────────────────────────────────────

// Load all products with their presentations
async function supaGetProducts() {
  const db = getSupabase();

  const { data: products, error: pErr } = await db
    .from('products')
    .select('code, name')
    .order('code');

  if (pErr) { console.error('Failed to load products:', pErr); return {}; }

  const { data: pres, error: prErr } = await db
    .from('presentations')
    .select('product_code, presentation, sku')
    .order('product_code');

  if (prErr) { console.error('Failed to load presentations:', prErr); return {}; }

  // Build PRODUCTS object matching existing format
  const result = {};
  for (const p of products) {
    result[p.code] = {
      name: p.name,
      presentations: pres
        .filter(pr => pr.product_code === p.code)
        .map(pr => ({ presentation: pr.presentation, sku: pr.sku }))
    };
  }
  return result;
}

// ─────────────────────────────────────────────────
//  Pricing helpers
// ─────────────────────────────────────────────────

// Load default prices
async function supaGetDefaultPrices() {
  const db = getSupabase();
  const { data, error } = await db
    .from('default_prices')
    .select('product_code, presentation, unit_price');

  if (error) { console.error('Failed to load default prices:', error); return {}; }

  const result = {};
  for (const row of data) {
    if (!result[row.product_code]) result[row.product_code] = {};
    result[row.product_code][row.presentation] = parseFloat(row.unit_price);
  }
  return result;
}

// Load customer-specific price overrides
async function supaGetCustomerPrices(customerId) {
  if (!customerId) return {};
  const db = getSupabase();
  const { data, error } = await db
    .from('customer_prices')
    .select('product_code, presentation, unit_price')
    .eq('customer_id', customerId);

  if (error) { console.error('Failed to load customer prices:', error); return {}; }

  const result = {};
  for (const row of data) {
    if (!result[row.product_code]) result[row.product_code] = {};
    result[row.product_code][row.presentation] = parseFloat(row.unit_price);
  }
  return result;
}

// ─────────────────────────────────────────────────
//  Order helpers
// ─────────────────────────────────────────────────

// Submit an order to the database
async function supaSubmitOrder(orderData, items) {
  const db = getSupabase();

  // Insert order header
  const { data: order, error: oErr } = await db
    .from('orders')
    .insert({
      customer_id:   orderData.customer_id,
      customer_name: orderData.name,
      company:       orderData.company,
      email:         orderData.email,
      phone:         orderData.phone,
      address:       orderData.address,
      notes:         orderData.notes,
      total:         orderData.total,
      status:        'pending'
    })
    .select()
    .single();

  if (oErr) { console.error('Failed to create order:', oErr); return { success: false, error: oErr.message }; }

  // Insert line items
  const lineItems = items.map(item => ({
    order_id:     order.id,
    product_code: item.code,
    product_name: item.name,
    presentation: item.presentation,
    sku:          item.sku,
    qty:          item.qty,
    unit_price:   item.unitPrice,
    line_total:   item.unitPrice != null ? item.unitPrice * item.qty : null
  }));

  const { error: liErr } = await db
    .from('order_items')
    .insert(lineItems);

  if (liErr) { console.error('Failed to insert order items:', liErr); return { success: false, error: liErr.message }; }

  return { success: true, orderId: order.id };
}

// ─────────────────────────────────────────────────
//  Registration helpers
// ─────────────────────────────────────────────────

async function supaRegister(formData) {
  const db = getSupabase();
  const hash = await hashPassword(formData.password);

  const { data, error } = await db
    .from('registration_requests')
    .insert({
      email:         formData.email.toLowerCase(),
      name:          formData.name,
      company:       formData.company,
      phone:         formData.phone || null,
      address:       formData.address || null,
      password_hash: hash,
      status:        'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Registration failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ─────────────────────────────────────────────────
//  Admin helpers
// ─────────────────────────────────────────────────

// Get all customers
async function supaGetCustomers() {
  const db = getSupabase();
  const { data, error } = await db.from('customers').select('*').order('company');
  if (error) { console.error(error); return []; }
  return data;
}

// Add a new customer
async function supaAddCustomer(customer) {
  const db = getSupabase();
  const hash = await hashPassword(customer.password);
  const { data, error } = await db
    .from('customers')
    .insert({
      email:         customer.email.toLowerCase(),
      name:          customer.name,
      company:       customer.company,
      phone:         customer.phone || null,
      address:       customer.address || null,
      password_hash: hash,
      is_admin:      customer.is_admin || false
    })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, customer: data };
}

// Update a customer
async function supaUpdateCustomer(id, updates) {
  const db = getSupabase();
  const payload = { ...updates, updated_at: new Date().toISOString() };
  // If password is being changed, hash it
  if (payload.password) {
    payload.password_hash = await hashPassword(payload.password);
    delete payload.password;
  }
  const { data, error } = await db.from('customers').update(payload).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, customer: data };
}

// Delete a customer
async function supaDeleteCustomer(id) {
  const db = getSupabase();
  const { error } = await db.from('customers').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Get pending registration requests
async function supaGetRegistrations() {
  const db = getSupabase();
  const { data, error } = await db.from('registration_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

// Approve a registration request
async function supaApproveRegistration(request) {
  const db = getSupabase();
  // Create customer from request
  const { error: cErr } = await db.from('customers').insert({
    email:         request.email,
    name:          request.name,
    company:       request.company,
    phone:         request.phone,
    address:       request.address,
    password_hash: request.password_hash,
    is_admin:      false
  });
  if (cErr) return { success: false, error: cErr.message };

  // Mark request as approved
  const { error: rErr } = await db.from('registration_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', request.id);
  if (rErr) return { success: false, error: rErr.message };
  return { success: true };
}

// Reject a registration request
async function supaRejectRegistration(id) {
  const db = getSupabase();
  const { error } = await db.from('registration_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Get all orders
async function supaGetOrders() {
  const db = getSupabase();
  const { data, error } = await db.from('orders').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

// Get order items for a specific order
async function supaGetOrderItems(orderId) {
  const db = getSupabase();
  const { data, error } = await db.from('order_items').select('*').eq('order_id', orderId).order('id');
  if (error) { console.error(error); return []; }
  return data;
}

// Update order status
async function supaUpdateOrderStatus(orderId, status) {
  const db = getSupabase();
  const { error } = await db.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Get customer prices for admin editing
async function supaGetAllCustomerPrices(customerId) {
  const db = getSupabase();
  const { data, error } = await db.from('customer_prices').select('*').eq('customer_id', customerId).order('product_code');
  if (error) { console.error(error); return []; }
  return data;
}

// Set a customer price override
async function supaSetCustomerPrice(customerId, productCode, presentation, unitPrice) {
  const db = getSupabase();
  const { data, error } = await db.from('customer_prices').upsert({
    customer_id:  customerId,
    product_code: productCode,
    presentation: presentation,
    unit_price:   unitPrice,
    updated_at:   new Date().toISOString()
  }, { onConflict: 'customer_id,product_code,presentation' }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, price: data };
}

// Update a default price (admin override for all customers)
async function supaUpdateDefaultPrice(productCode, presentation, unitPrice) {
  const db = getSupabase();
  const { data, error } = await db.from('default_prices')
    .update({ unit_price: unitPrice, updated_at: new Date().toISOString() })
    .eq('product_code', productCode)
    .eq('presentation', presentation)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, price: data };
}

// Delete a customer price override (revert to default)
async function supaDeleteCustomerPrice(priceId) {
  const db = getSupabase();
  const { error } = await db.from('customer_prices').delete().eq('id', priceId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
