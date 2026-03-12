const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('C:/Users/dcastro/OneDrive - Ultragroup/Documents/U1P/Ultra1Plus/PRODUCT LISTS/SKU LIST - FOR WEBSITE  SERVER - UPDATED 03.11.2026.xlsx');

// Sheet "NAME": columns CODE, PRODUCT NAME
const nameData = XLSX.utils.sheet_to_json(wb.Sheets['NAME'], {header:1, defval:''});
const names = {};
for (const row of nameData.slice(1)) {
  const code = String(row[0] || '').trim();
  const name = String(row[1] || '').trim();
  if (code && name) names[code] = name;
}

// Sheet "SKU": columns CODE, PRESENTATION, SKU
const skuData = XLSX.utils.sheet_to_json(wb.Sheets['SKU'], {header:1, defval:''});
const products = {};
for (const row of skuData.slice(1)) {
  const code = String(row[0] || '').trim();
  const presentation = String(row[1] || '').trim();
  const sku = String(row[2] || '').trim();
  if (!code || !presentation) continue;
  if (!products[code]) products[code] = { name: names[code] || code, presentations: [] };
  products[code].presentations.push({ presentation, sku });
}

const lines = ['const PRODUCTS = {'];
const keys = Object.keys(products);
keys.forEach((code, i) => {
  const p = products[code];
  const comma = i < keys.length - 1 ? ',' : '';
  lines.push(`  ${JSON.stringify(code)}: {"name": ${JSON.stringify(p.name)}, "presentations": ${JSON.stringify(p.presentations)}}${comma}`);
});
lines.push('};');

fs.writeFileSync('products_data.js', lines.join('\n') + '\n');
console.log('Done. Products:', keys.length, 'Total SKUs:', skuData.length - 1);
