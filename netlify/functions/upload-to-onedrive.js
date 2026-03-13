// Uploads order CSV and Dispatch Note PDF to OneDrive folder
// Target: dc@ultra1plus.com > despacho fabrica houston
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const TENANT_ID     = process.env.AZURE_TENANT_ID;
  const CLIENT_ID     = process.env.AZURE_CLIENT_ID;
  const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
  const ONEDRIVE_USER = 'dc@ultra1plus.com';
  const FOLDER_PATH   = 'despacho fabrica houston';

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Azure credentials not configured' }) };
  }

  try {
    const order = JSON.parse(event.body);
    const { name, company, email, phone, address, notes, items, total, orderId, dispatchNumber } = order;

    // ── 1. Get Microsoft Graph access token ──
    const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Token error:', tokenData);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to get access token', details: tokenData.error_description }) };
    }
    const accessToken = tokenData.access_token;

    // ── 2. Build CSV content ──
    const dateShort = new Date().toISOString().slice(0, 10);
    const escapeCsv = (v) => {
      const s = String(v || '');
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    let totalWeightLbs = 0;
    let hasWeight = false;

    let csv = 'Product Code,Product Name,Presentation,SKU,Qty,Weight (lbs),Weight (kg),Unit Price,Line Total\n';
    items.forEach(item => {
      const up = item.unitPrice != null ? item.unitPrice : '';
      const lt = item.unitPrice != null ? (item.unitPrice * item.qty).toFixed(2) : '';
      const wLbs = item.weightLbs != null ? (item.weightLbs * item.qty).toFixed(2) : '';
      const wKg = item.weightLbs != null ? (item.weightLbs * item.qty * 0.453592).toFixed(2) : '';
      if (item.weightLbs != null) { totalWeightLbs += item.weightLbs * item.qty; hasWeight = true; }
      csv += `${escapeCsv(item.code)},${escapeCsv(item.name)},${escapeCsv(item.presentation)},${escapeCsv(item.sku)},${item.qty},${wLbs},${wKg},${up},${lt}\n`;
    });
    const totalCsvWeight = hasWeight ? totalWeightLbs.toFixed(2) : '';
    const totalCsvWeightKg = hasWeight ? (totalWeightLbs * 0.453592).toFixed(2) : '';
    const totalCsvPrice = total != null ? Number(total).toFixed(2) : '';
    csv += `,,,,TOTALS,${totalCsvWeight},${totalCsvWeightKg},,${totalCsvPrice}\n`;

    // ── 3. Upload CSV ──
    const companySlug = (company || 'Order').replace(/[^a-zA-Z0-9]/g, '_');
    const dispPrefix = dispatchNumber ? `${dispatchNumber}_` : '';
    const csvFilename = `Order_${dispPrefix}${companySlug}_${dateShort}.csv`;
    const csvBuffer = Buffer.from(csv, 'utf-8');

    const csvUploadRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${ONEDRIVE_USER}/drive/root:/${FOLDER_PATH}/${csvFilename}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'text/csv',
        },
        body: csvBuffer,
      }
    );
    const csvUploadData = await csvUploadRes.json();
    if (!csvUploadRes.ok) {
      console.error('CSV upload error:', csvUploadData);
    }

    // ── 4. Build simple text summary for a TXT dispatch note ──
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let dispatch = '';
    dispatch += `DISPATCH NOTE\n`;
    dispatch += `${'='.repeat(60)}\n`;
    dispatch += `Date: ${date}\n`;
    dispatch += `Dispatch #: ${dispatchNumber || 'N/A'}\n`;
    dispatch += `Order ID: ${orderId || 'N/A'}\n\n`;
    dispatch += `CUSTOMER\n`;
    dispatch += `${'-'.repeat(40)}\n`;
    dispatch += `Name:    ${name || ''}\n`;
    dispatch += `Company: ${company || ''}\n`;
    dispatch += `Email:   ${email || ''}\n`;
    dispatch += `Phone:   ${phone || ''}\n`;
    dispatch += `Address: ${address || ''}\n\n`;
    dispatch += `ORDER ITEMS\n`;
    dispatch += `${'-'.repeat(40)}\n`;
    dispatch += `${'#'.padEnd(4)}${'Code'.padEnd(10)}${'Presentation'.padEnd(18)}${'Qty'.padEnd(6)}${'Wt(lbs)'.padEnd(10)}${'Price'.padEnd(10)}${'Total'.padEnd(10)}\n`;

    items.forEach((item, i) => {
      const wt = item.weightLbs != null ? (item.weightLbs * item.qty).toFixed(1) : '--';
      const up = item.unitPrice != null ? `$${Number(item.unitPrice).toFixed(2)}` : '--';
      const lt = item.unitPrice != null ? `$${(item.unitPrice * item.qty).toFixed(2)}` : '--';
      dispatch += `${String(i + 1).padEnd(4)}${(item.code || '').padEnd(10)}${(item.presentation || '').padEnd(18)}${String(item.qty).padEnd(6)}${wt.padEnd(10)}${up.padEnd(10)}${lt.padEnd(10)}\n`;
    });

    dispatch += `${'-'.repeat(40)}\n`;
    dispatch += `TOTAL: ${total != null ? '$' + Number(total).toFixed(2) : 'N/A'}`;
    if (hasWeight) dispatch += `  |  Weight: ${totalWeightLbs.toFixed(1)} lbs (${(totalWeightLbs * 0.453592).toFixed(1)} kg)`;
    dispatch += '\n';
    if (notes) dispatch += `\nNOTES: ${notes}\n`;
    dispatch += `\n${'='.repeat(60)}\n`;
    dispatch += `Generated from Ultra1Plus Distributor Portal\n`;

    // ── 5. Upload dispatch note TXT ──
    const dispatchFilename = `Dispatch_${dispPrefix}${companySlug}_${dateShort}.txt`;
    const dispatchBuffer = Buffer.from(dispatch, 'utf-8');

    const dispatchUploadRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${ONEDRIVE_USER}/drive/root:/${FOLDER_PATH}/${dispatchFilename}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'text/plain',
        },
        body: dispatchBuffer,
      }
    );
    const dispatchUploadData = await dispatchUploadRes.json();
    if (!dispatchUploadRes.ok) {
      console.error('Dispatch upload error:', dispatchUploadData);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        csv: csvUploadData.name || csvFilename,
        dispatch: dispatchUploadData.name || dispatchFilename,
      }),
    };

  } catch (err) {
    console.error('Upload function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
