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

    // Build HTML email
    let itemRows = '';
    items.forEach((item, i) => {
      const unitPrice = item.unitPrice != null ? `$${Number(item.unitPrice).toFixed(2)}` : '—';
      const lineTotal = item.unitPrice != null ? `$${(item.unitPrice * item.qty).toFixed(2)}` : '—';
      itemRows += `
        <tr style="border-bottom:1px solid #e5e5e5;">
          <td style="padding:8px;text-align:center;">${i + 1}</td>
          <td style="padding:8px;">${item.code}</td>
          <td style="padding:8px;font-size:12px;color:#666;">${item.name || ''}</td>
          <td style="padding:8px;">${item.presentation}</td>
          <td style="padding:8px;">${item.sku}</td>
          <td style="padding:8px;text-align:center;">${item.qty}</td>
          <td style="padding:8px;text-align:right;">${unitPrice}</td>
          <td style="padding:8px;text-align:right;font-weight:600;">${lineTotal}</td>
        </tr>`;
    });

    const totalDisplay = total != null ? `$${Number(total).toFixed(2)}` : 'N/A';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const dateShort = new Date().toISOString().slice(0, 10);

    // Build CSV attachment
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
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
      <div style="background:#000;padding:20px 30px;text-align:center;">
        <img src="https://cdn11.bigcommerce.com/s-w94u0bjkb6/images/stencil/original/recurso_1_1757027375__15872.original.png" alt="Ultra1Plus" style="height:40px;" />
      </div>
      <div style="background:#FFC700;padding:12px 30px;">
        <h2 style="margin:0;font-size:18px;color:#000;">New Order Received</h2>
      </div>
      <div style="padding:24px 30px;background:#fff;">
        <p style="margin:0 0 16px;color:#333;font-size:14px;"><strong>Date:</strong> ${date}</p>

        <table style="width:100%;margin-bottom:20px;font-size:14px;">
          <tr><td style="padding:4px 0;color:#666;width:100px;">Name:</td><td style="padding:4px 0;font-weight:600;">${name}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Company:</td><td style="padding:4px 0;font-weight:600;">${company}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Email:</td><td style="padding:4px 0;"><a href="mailto:${email}">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:4px 0;color:#666;">Phone:</td><td style="padding:4px 0;">${phone}</td></tr>` : ''}
          ${address ? `<tr><td style="padding:4px 0;color:#666;">Ship To:</td><td style="padding:4px 0;">${address}</td></tr>` : ''}
        </table>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
          <thead>
            <tr style="background:#000;color:#FFC700;">
              <th style="padding:10px 8px;text-align:center;width:30px;">#</th>
              <th style="padding:10px 8px;text-align:left;">Code</th>
              <th style="padding:10px 8px;text-align:left;">Product Name</th>
              <th style="padding:10px 8px;text-align:left;">Presentation</th>
              <th style="padding:10px 8px;text-align:left;">SKU</th>
              <th style="padding:10px 8px;text-align:center;">Qty</th>
              <th style="padding:10px 8px;text-align:right;">Unit Price</th>
              <th style="padding:10px 8px;text-align:right;">Line Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr style="background:#f6f6f6;font-weight:700;">
              <td colspan="7" style="padding:10px 8px;text-align:right;">ESTIMATED TOTAL:</td>
              <td style="padding:10px 8px;text-align:right;">${totalDisplay}</td>
            </tr>
          </tfoot>
        </table>

        ${notes ? `<div style="background:#f6f6f6;padding:12px 16px;border-left:3px solid #FFC700;margin-bottom:16px;font-size:14px;"><strong>Notes:</strong> ${notes}</div>` : ''}

        <p style="font-size:12px;color:#999;margin-top:24px;">This order was placed via the Ultra1Plus Distributor Portal.</p>
      </div>
    </div>`;

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
