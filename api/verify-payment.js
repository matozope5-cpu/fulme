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

    // ─── HASHAY CREDENTIALS ──────────────────────────────────────────
    const HASHAY_CONFIG = {
      verifyUrl: 'https://hashpay.stkpush.co.ke/api/verify-payment/'
    };

    const response = await fetch(
      `${HASHAY_CONFIG.verifyUrl}${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      }
    );

    // If the status endpoint is not available, we fall back to a simulated pending.
    // This matches the original behaviour.
    if (!response.ok) {
      // Return a pending status so the frontend continues polling
      return res.status(200).json({
        success: true,
        status: 'PENDING',
        message: 'Status endpoint returned error, simulating pending'
      });
    }

    const result = await response.json();

    // ─── MAP HASHAY STATUS TO FRONTEND EXPECTED VALUES ──────────────
    // HashPay may return status in various fields
    const rawStatus =
      result.status ||
      result.payment_status ||
      result.transaction_status ||
      result.data?.status ||
      result.data?.payment_status ||
      result.data?.transaction_status ||
      '';

    let status = 'PENDING';
    const lower = String(rawStatus).toLowerCase();

    if (lower.includes('success') || lower.includes('complete') || lower.includes('paid')) {
      status = 'COMPLETED';
    } else if (lower.includes('fail') || lower.includes('cancel') || lower.includes('declin') || lower.includes('error') || lower.includes('revers')) {
      status = 'FAILED';
    } else if (lower.includes('pending') || lower.includes('processing')) {
      status = 'PENDING';
    } else {
      // If status is empty or unknown, assume pending
      status = 'PENDING';
    }

    res.status(200).json({
      success: true,
      status: status,
      data: result
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      success: false
    });
  }
}