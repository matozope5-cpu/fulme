// pages/api/verify-payment.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

    // ─── HASHAY VERIFY ENDPOINT ──────────────────────────────────────
    const VERIFY_URL = 'https://hashpay.stkpush.co.ke/api/verify-payment/';

    // Optionally, you can try both the given reference and a fallback
    // but we'll stick with one for now.

    const response = await fetch(`${VERIFY_URL}${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    // Log the raw response for debugging
    const bodyText = await response.text();
    console.log(`HashPay Verify Response (${reference}):`, bodyText);

    let result = {};
    try {
      result = bodyText ? JSON.parse(bodyText) : {};
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      // If parsing fails, treat as pending
      return res.status(200).json({
        success: true,
        status: 'PENDING',
        message: 'Invalid JSON response, assuming pending',
        raw: bodyText
      });
    }

    // If the HTTP status is not OK, we still return pending to allow polling
    if (!response.ok) {
      console.warn(`Verify endpoint returned ${response.status} for reference ${reference}`);
      return res.status(200).json({
        success: true,
        status: 'PENDING',
        message: `Endpoint error (${response.status}), simulating pending`,
        raw: result
      });
    }

    // ─── MAP HASHAY STATUS TO FRONTEND EXPECTED VALUES ──────────────
    // Extract status from various possible fields
    const rawStatus =
      result.status ||
      result.payment_status ||
      result.transaction_status ||
      result.data?.status ||
      result.data?.payment_status ||
      result.data?.transaction_status ||
      result.ResultCode || // some APIs use this
      '';

    let status = 'PENDING';
    const lower = String(rawStatus).toLowerCase();

    if (
      lower.includes('success') ||
      lower.includes('complete') ||
      lower.includes('paid') ||
      lower === '0' // some gateways use 0 for success
    ) {
      status = 'COMPLETED';
    } else if (
      lower.includes('fail') ||
      lower.includes('cancel') ||
      lower.includes('declin') ||
      lower.includes('error') ||
      lower.includes('revers') ||
      lower === '1' // some use 1 for failure
    ) {
      status = 'FAILED';
    } else if (
      lower.includes('pending') ||
      lower.includes('processing') ||
      lower.includes('initiated')
    ) {
      status = 'PENDING';
    } else {
      // If status is empty or unknown, assume pending
      status = 'PENDING';
    }

    res.status(200).json({
      success: true,
      status: status,
      data: result,
      // Include the raw status for debugging
      raw_status: rawStatus
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      success: false
    });
  }
}