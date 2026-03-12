const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('C:/Users/dcastro/OneDrive - Ultragroup/Documents/U1P/Ultra1Plus/SALES/ULTRA1PLUS PRICE (U1D to U1P)/11-10-25 - HOUSTON - SALES PRICE LIST - FIXED PRICE 25% - V2.5.xlsx');

const prices = {};
const r2 = (n) => (typeof n === 'number' && n > 0) ? Math.round(n * 100) / 100 : null;

// ── OIL SHEET ──
// Cols: 0=name, 1=code, 2=BULK_GAL, 3=TOTE(265G), 4=DRUM(55G), 5=PAIL(5G),
//       6=BOX(4G), 7=BOX(3/5QTS), 8=12/1L Case Drop Bottle, 9=20L BIDON, 10=BOX(12Q)
const oilData = XLSX.utils.sheet_to_json(wb.Sheets['OIL SALE PRICE HOUSTON'], {header:1, defval:''});
const oilMap = {
  'BULK (OIL)':   2,
  'BULK (COOL)':  2,
  'TOTE (265G)':  3,
  'DRUM (55G)':   4,
  'PAIL (5G)':    5,
  'BOX (4G)':     6,
  'BOX (3/5QTS)': 7,
  'JERRYCAN (20L)': 9,
  'BOX (12Q)':    10,
};
for (const row of oilData) {
  const code = String(row[1] || '').trim();
  if (!code.match(/^UL\d/)) continue;
  const entry = {};
  for (const [pres, col] of Object.entries(oilMap)) {
    const v = r2(row[col]);
    if (v) entry[pres] = v;
  }
  if (Object.keys(entry).length) prices[code] = entry;
}

// ── COOLANT SHEET ──
// Cols: 0=name, 1=code, 2=BULK_GAL, 3=TOTE(250G), 4=DRUM(55G), 5=PAIL(5G),
//       6=BOX(6G), 7=JERRY CAN, 8=BOX(12Q)
const coolData = XLSX.utils.sheet_to_json(wb.Sheets['COOLANT SALE PRICE HOUSTON'], {header:1, defval:''});
const coolMap = {
  'BULK (COOL)':  2,
  'BULK (OIL)':   2,
  'TOTE (265G)':  3,
  'DRUM (55G)':   4,
  'PAIL (5G)':    5,
  'BOX (6G)':     6,
  'JERRYCAN (20L)': 7,
  'BOX (12Q)':    8,
};
for (const row of coolData) {
  const code = String(row[1] || '').trim();
  if (!code.match(/^UL[89]\d\d/)) continue;
  const entry = {};
  for (const [pres, col] of Object.entries(coolMap)) {
    const v = r2(row[col]);
    if (v) entry[pres] = v;
  }
  if (Object.keys(entry).length) prices[code] = entry;
}

// ── DEF & WW SHEET ──
// UL990 DEF: [Code, BULK, 330G Tote, 208L Drum, 19L Pail, BOX 1x2.5, 20L BIDON, BOX 2x2.5]
// UL980/UL982 WW: [Code, BOX 12x1 Lt, BOX 6x1 Gal, Drum 55gal, TOTE]
const defData = XLSX.utils.sheet_to_json(wb.Sheets['DEF & WW SALE PRICE HOU'], {header:1, defval:''});
for (const row of defData) {
  const code = String(row[0] || '').trim();
  if (code === 'UL990') {
    prices['UL990'] = {};
    const v = (c) => r2(row[c]);
    if (v(1)) prices['UL990']['BULK'] = v(1);
    if (v(2)) prices['UL990']['TOTE (330G)'] = v(2);
    if (v(3)) prices['UL990']['DRUM (55G)'] = v(3);
    if (v(4)) prices['UL990']['PAIL (5G)'] = v(4);
    if (v(5)) prices['UL990']['BOX 1x2.5'] = v(5);
    if (v(6)) prices['UL990']['JERRYCAN (20L)'] = v(6);
    if (v(7)) prices['UL990']['BOX 2x2.5'] = v(7);
  }
  if (code === 'UL980' || code === 'UL982') {
    prices[code] = {};
    const v = (c) => r2(row[c]);
    if (v(1)) prices[code]['BOX (12/1L)'] = v(1);
    if (v(2)) prices[code]['BOX (6/1G)'] = v(2);
    if (v(3)) prices[code]['DRUM (55G)'] = v(3);
    if (v(4)) prices[code]['TOTE'] = v(4);
  }
}

const output =
`// Default pricing — Houston Sales Price List (Nov 2025)
// Source: 11-10-25 - HOUSTON - SALES PRICE LIST - FIXED PRICE 25% - V2.5.xlsx
// Prices in USD per unit/container. Keys match products_data.js presentation names.
// This is the DEFAULT list. Customer-specific pricing files will override these values.
const DEFAULT_PRICES = ${JSON.stringify(prices, null, 2)};
`;

fs.writeFileSync('pricing_data.js', output);
console.log('Done. Products priced:', Object.keys(prices).length);
console.log('UL100:', JSON.stringify(prices['UL100']));
console.log('UL930:', JSON.stringify(prices['UL930']));
console.log('UL990:', JSON.stringify(prices['UL990']));
