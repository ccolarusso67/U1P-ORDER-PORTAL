exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  try {
    const order = JSON.parse(event.body);
    const { name, company, email, phone, address, notes, items, total, orderId } = order;

    // Build HTML email — 5 columns: Product (code+name), Presentation, Qty, Price, Total
    let itemRows = '';
    items.forEach((item, i) => {
      const unitPrice = item.unitPrice != null ? `$${Number(item.unitPrice).toFixed(2)}` : '—';
      const lineTotal = item.unitPrice != null ? `$${(item.unitPrice * item.qty).toFixed(2)}` : '—';
      const productLabel = item.name ? `<strong>${item.code}</strong><br><span style="font-size:11px;color:#666;">${item.name}</span>` : `<strong>${item.code}</strong>`;
      itemRows += `
        <tr style="border-bottom:1px solid #e5e5e5;">
          <td style="padding:8px 6px;vertical-align:top;">${productLabel}</td>
          <td style="padding:8px 6px;">${item.presentation}<br><span style="font-size:11px;color:#999;">${item.sku}</span></td>
          <td style="padding:8px 6px;text-align:center;">${item.qty}</td>
          <td style="padding:8px 6px;text-align:right;">${unitPrice}</td>
          <td style="padding:8px 6px;text-align:right;font-weight:600;">${lineTotal}</td>
        </tr>`;
    });

    const totalDisplay = total != null ? `$${Number(total).toFixed(2)}` : 'N/A';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const dateShort = new Date().toISOString().slice(0, 10);

    // Build CSV attachment (full detail)
    let csv = 'Product Code,Product Name,Presentation,SKU,Qty,Unit Price,Line Total\n';
    items.forEach(item => {
      const up = item.unitPrice != null ? item.unitPrice : '';
      const lt = item.unitPrice != null ? (item.unitPrice * item.qty).toFixed(2) : '';
      const escapeCsv = (v) => {
        const s = String(v || '');
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      };
      csv += `${escapeCsv(item.code)},${escapeCsv(item.name)},${escapeCsv(item.presentation)},${escapeCsv(item.sku)},${item.qty},${up},${lt}\n`;
    });
    if (total != null) {
      csv += `,,,,,,${Number(total).toFixed(2)}\n`;
    }
    const csvBase64 = Buffer.from(csv).toString('base64');
    const filename = `Order_${company.replace(/[^a-zA-Z0-9]/g, '_')}_${dateShort}.csv`;

    const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f4f4f4;">
    <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:#000;padding:20px 24px;text-align:center;">
          <img src="https://cdn11.bigcommerce.com/s-w94u0bjkb6/images/stencil/original/recurso_1_1757027375__15872.original.png" alt="Ultra1Plus" width="150" style="height:auto;display:block;margin:0 auto;" />
        </td></tr>
        <tr><td style="background:#FFC700;padding:10px 24px;">
          <h2 style="margin:0;font-size:16px;color:#000;font-family:Arial,Helvetica,sans-serif;">New Order Received</h2>
        </td></tr>
        <tr><td style="background:#fff;padding:20px 24px;">
          <p style="margin:0 0 14px;color:#333;font-size:13px;"><strong>Date:</strong> ${date}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;font-size:13px;">
            <tr><td style="padding:3px 0;color:#666;width:70px;">Name:</td><td style="padding:3px 0;font-weight:600;">${name}</td></tr>
            <tr><td style="padding:3px 0;color:#666;">Company:</td><td style="padding:3px 0;font-weight:600;">${company}</td></tr>
            <tr><td style="padding:3px 0;color:#666;">Email:</td><td style="padding:3px 0;"><a href="mailto:${email}" style="color:#1a6b3c;">${email}</a></td></tr>
            ${phone ? `<tr><td style="padding:3px 0;color:#666;">Phone:</td><td style="padding:3px 0;">${phone}</td></tr>` : ''}
            ${address ? `<tr><td style="padding:3px 0;color:#666;">Ship To:</td><td style="padding:3px 0;">${address}</td></tr>` : ''}
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;margin-bottom:14px;">
            <tr style="background:#000;color:#FFC700;">
              <th style="padding:8px 6px;text-align:left;font-size:11px;font-weight:700;">PRODUCT</th>
              <th style="padding:8px 6px;text-align:left;font-size:11px;font-weight:700;">PRESENTATION</th>
              <th style="padding:8px 6px;text-align:center;font-size:11px;font-weight:700;width:36px;">QTY</th>
              <th style="padding:8px 6px;text-align:right;font-size:11px;font-weight:700;width:64px;">PRICE</th>
              <th style="padding:8px 6px;text-align:right;font-size:11px;font-weight:700;width:72px;">TOTAL</th>
            </tr>
            ${itemRows}
            <tr style="background:#f6f6f6;">
              <td colspan="4" style="padding:10px 6px;text-align:right;font-weight:700;font-size:12px;">ESTIMATED TOTAL:</td>
              <td style="padding:10px 6px;text-align:right;font-weight:700;font-size:13px;">${totalDisplay}</td>
            </tr>
          </table>

          ${notes ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;"><tr><td style="background:#f6f6f6;padding:10px 14px;border-left:3px solid #FFC700;font-size:13px;"><strong>Notes:</strong> ${notes}</td></tr></table>` : ''}

          <p style="font-size:11px;color:#999;margin:18px 0 0;">This order was placed via the Ultra1Plus Distributor Portal.</p>
          <p style="font-size:11px;color:#999;margin:4px 0 0;">Full order details are attached as a CSV file.</p>
        </td></tr>
      </table>
    </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
    </body></html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ultra1Plus Orders <orders@ultra1plus.com>',
        to: ['orders@ultra1plus.com'],
        subject: `New Order — ${company} — ${date}`,
        html: html,
        attachments: [{
          filename: filename,
          content: csvBase64,
        }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return { statusCode: response.status, body: JSON.stringify({ error: data.message || 'Failed to send email' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, id: data.id }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
