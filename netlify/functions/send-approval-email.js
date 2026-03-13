// Sends welcome email to customer when their registration is approved
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  try {
    const { name, company, email } = JSON.parse(event.body);

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
          <h2 style="margin:0;font-size:16px;color:#000;font-family:Arial,Helvetica,sans-serif;">&#x2705; Account Approved!</h2>
        </td></tr>
        <tr><td style="background:#fff;padding:24px;">
          <p style="margin:0 0 16px;color:#333;font-size:14px;">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;color:#333;font-size:14px;">Great news! Your Ultra1Plus Distributor Order Portal account has been approved. You can now log in and start placing orders.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="background:#f9f9f9;padding:16px 20px;border-left:4px solid #FFC700;">
              <p style="margin:0 0 6px;font-size:13px;color:#666;"><strong>Your Login Details:</strong></p>
              <p style="margin:0 0 4px;font-size:13px;color:#333;"><strong>Email:</strong> ${email}</p>
              <p style="margin:0;font-size:13px;color:#333;"><strong>Password:</strong> The password you chose during registration</p>
            </td></tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="background:#000;padding:16px 20px;text-align:center;">
              <a href="https://orders.ultra1plus.us/login.html" style="color:#FFC700;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:1px;">&#x2192; LOG IN TO ORDER PORTAL</a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;color:#333;font-size:13px;"><strong>What you can do:</strong></p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;font-size:13px;">
            <tr><td style="padding:4px 0;color:#333;">&#x2022; Browse the complete Ultra1Plus product catalog</td></tr>
            <tr><td style="padding:4px 0;color:#333;">&#x2022; View your exclusive distributor pricing</td></tr>
            <tr><td style="padding:4px 0;color:#333;">&#x2022; Place orders directly through the portal</td></tr>
            <tr><td style="padding:4px 0;color:#333;">&#x2022; Receive order confirmations by email</td></tr>
          </table>

          <p style="margin:0 0 4px;color:#333;font-size:13px;">If you have any questions, contact your Ultra1Plus account manager or reply to this email.</p>
          <p style="font-size:11px;color:#999;margin:18px 0 0;">Welcome aboard — the Ultra1Plus team</p>
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
        to: [email],
        subject: `Your Ultra1Plus Account Has Been Approved — Welcome!`,
        html: html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Approval email error:', data);
      return { statusCode: res.status, body: JSON.stringify(data) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, id: data.id }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
