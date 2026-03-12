# U1P Order Portal — Project Context

## Project Root
All work for this project lives in:
`C:\Users\dcastro\OneDrive - Ultragroup\Desktop\VIVECODING\U1P ORDER PORTAL`

## Project Files
- `order_form.html` — Main order form (single-page web app)
- `products_data.js` — All product SKUs and presentations generated from the SKU LIST Excel file
- `serve.pl` — Perl-based static file server for local preview (port 3002)

## Source Data
SKU data was generated from:
`C:\Users\dcastro\OneDrive - Ultragroup\Documents\U1P\Ultra1Plus\PRODUCT LISTS\SKU LIST - FOR SERVER - UPDATED 02.17.2026.xlsx`
- Sheet "SKU": columns CODE, PRESENTATION, SKU
- Sheet "NAME": columns CODE, PRODUCT NAME

## Dev Server
Start via `.claude/launch.json` → **"U1P Order Portal"**
Runs on http://localhost:3002 using Perl (C:\Program Files\Git\usr\bin\perl.exe).

## Brand Guidelines
- Primary black: #000000
- Accent gold: #FFC700
- White: #ffffff
- Font: Rubik (headings, bold/uppercase), Inter (body)
- Logo: loaded from https://cdn11.bigcommerce.com/s-w94u0bjkb6/images/stencil/original/recurso_1_1757027375__15872.original.png
- Button style: clip-path diagonal polygon(12% 0, 100% 0%, 88% 100%, 0% 100%)
- Reference site: https://ultra1plus.com

## Key Config (in order_form.html)
```js
const ORDER_EMAIL = 'orders@ultra1plus.com';  // ← update to actual receiving address
```

## How it Works
1. Client fills in contact info (name, company, email, phone, address)
2. Searchable UL number dropdown → presentation dropdown → quantity → Add to cart
3. Running order table with remove/clear controls
4. Submit opens mailto: with the full formatted order pre-filled
