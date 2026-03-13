// Sends admin notification when a new customer registers
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  try {
    const { name, company, email, phone, address } = JSON.parse(event.body);
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
          <h2 style="margin:0;font-size:16px;color:#000;font-family:Arial,Helvetica,sans-serif;">&#x1F514; New Registration Request</h2>
        </td></tr>
        <tr><td style="background:#fff;padding:24px;">
          <p style="margin:0 0 16px;color:#333;font-size:13px;">A new customer has requested access to the Distributor Order Portal.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;font-size:13px;border-collapse:collapse;">
            <tr><td style="padding:10px 12px;color:#666;width:100px;background:#f9f9f9;border-bottom:1px solid #eee;font-weight:600;">Name</td><td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:700;">${name}</td></tr>
            <tr><td style="padding:10px 12px;color:#666;background:#f9f9f9;border-bottom:1px solid #eee;font-weight:600;">Company</td><td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:700;">${company}</td></tr>
            <tr><td style="padding:10px 12px;color:#666;background:#f9f9f9;border-bottom:1px solid #eee;font-weight:600;">Email</td><td style="padding:10px 12px;border-bottom:1px solid #eee;"><a href="mailto:${email}" style="color:#1a6b3c;">${email}</a></td></tr>
            ${phone ? `<tr><td style="padding:10px 12px;color:#666;background:#f9f9f9;border-bottom:1px solid #eee;font-weight:600;">Phone</td><td style="padding:10px 12px;border-bottom:1px solid #eee;">${phone}</td></tr>` : ''}
            ${address ? `<tr><td style="padding:10px 12px;color:#666;background:#f9f9f9;border-bottom:1px solid #eee;font-weight:600;">Address</td><td style="padding:10px 12px;border-bottom:1px solid #eee;">${address}</td></tr>` : ''}
            <tr><td style="padding:10px 12px;color:#666;background:#f9f9f9;font-weight:600;">Date</td><td style="padding:10px 12px;">${date}</td></tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#000;padding:14px 20px;text-align:center;">
              <a href="https://orders.ultra1plus.us/admin.html" style="color:#FFC700;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:1px;">&#x2192; REVIEW IN ADMIN PANEL</a>
            </td></tr>
          </table>

          <p style="font-size:11px;color:#999;margin:18px 0 0;">Log in to the Admin Panel to approve or reject this request.</p>
        </td></tr>
      </table>
    </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
    </body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ultra1Plus Portal <orders@ultra1plus.com>',
        to: ['orders@ultra1plus.com'],
        subject: `New Registration Request — ${name} (${company})`,
        html: html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Registration email error:', data);
      return { statusCode: res.status, body: JSON.stringify(data) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, id: data.id }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
