#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  U1P ORDER PORTAL — Data Migration to Supabase
//  Run once: node migrate_to_supabase.js
//  Reads products_data.js and pricing_data.js and inserts into Supabase
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://tkntgaqdpmgaozevflpv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HONO8emXIRva-QioeDvafw_VSMPGcQV';

const fs   = require('fs');
const path = require('path');

function loadJSData(filename, varName) {
  const code = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  const fn = new Function(code + '; return ' + varName + ';');
  return fn();
}

async function main() {
  console.log('Loading data from JS files...');
  const PRODUCTS       = loadJSData('products_data.js', 'PRODUCTS');
  const DEFAULT_PRICES = loadJSData('pricing_data.js', 'DEFAULT_PRICES');

  const productCodes = Object.keys(PRODUCTS);
  console.log('Found ' + productCodes.length + ' products');
  console.log('Found ' + Object.keys(DEFAULT_PRICES).length + ' priced products');

  async function supaInsert(table, rows) {
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type':  'application/json',
          'Prefer':        'resolution=merge-duplicates'
        },
        body: JSON.stringify(batch)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error('Failed to insert into ' + table + ': ' + res.status + ' ' + err);
      }
      inserted += batch.length;
    }
    return inserted;
  }

  // Products already inserted, skip
  // const productRows = productCodes.map(code => ({ code, name: PRODUCTS[code].name }));
  // await supaInsert('products', productRows);
  console.log('\n1. Products already inserted, skipping...');

  // 2. Insert Presentations (deduplicated)
  console.log('2. Inserting presentations...');
  const presMap = new Map();
  for (const code of productCodes) {
    for (const pres of PRODUCTS[code].presentations) {
      const key = code + '|' + pres.presentation;
      if (!presMap.has(key)) {
        presMap.set(key, {
          product_code: code,
          presentation: pres.presentation,
          sku:          pres.sku
        });
      }
    }
  }
  const presRows = Array.from(presMap.values());
  const prCount = await supaInsert('presentations', presRows);
  console.log('   Done: ' + prCount + ' presentations inserted');

  // 3. Insert Default Prices
  console.log('3. Inserting default prices...');
  const priceRows = [];
  for (const code of Object.keys(DEFAULT_PRICES)) {
    for (const [presentation, price] of Object.entries(DEFAULT_PRICES[code])) {
      priceRows.push({
        product_code: code,
        presentation: presentation,
        unit_price:   price
      });
    }
  }
  const dpCount = await supaInsert('default_prices', priceRows);
  console.log('   Done: ' + dpCount + ' default prices inserted');

  console.log('\n=== Migration complete! ===');
  console.log('Presentations: ' + prCount);
  console.log('Default Prices: ' + dpCount);
}

main().catch(function(err) {
  console.error('Migration failed:', err);
  process.exit(1);
});
