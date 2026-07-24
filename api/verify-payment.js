export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

    // ─── MAKAMESCO CREDENTIALS (hardcoded, like PayHero) ─────────────
    const MAKAMESCO_CONFIG = {
      apiUrl: 'https://makamescopay.com/api/payments',
      apiKey: 'sk_a605f1deb71d61a6d5c7fcd5a1bf641b3a57f86ecd605bb16414042241ea8e7e'
    };

    const response = await fetch(`${MAKAMESCO_CONFIG.apiUrl}/status/${reference}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MAKAMESCO_CONFIG.apiKey
      }
    });

    // If the status endpoint is not available, we fall back to a simulated pending.
    // This matches the sample server.js behaviour.
    if (!response.ok) {
      // Return a pending status so the frontend continues polling
      return res.status(200).json({
        success: true,
        status: 'PENDING',
        message: 'Status endpoint returned error, simulating pending'
      });
    }

    const result = await response.json();

    // Map Makamesco status to the frontend's expected values
    let status = result.status || 'PENDING';
    if (status === 'completed') status = 'COMPLETED';
    else if (status === 'failed') status = 'FAILED';
    else if (status === 'pending' || status === 'processing') status = 'PENDING';
    // else keep as is

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