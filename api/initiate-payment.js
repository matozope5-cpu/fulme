export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone_number, amount, loan_amount, id_number } = req.body;

    // Validate input
    if (!phone_number || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ─── MAKAMESCO CREDENTIALS (hardcoded, like PayHero) ─────────────
    const MAKAMESCO_CONFIG = {
      apiUrl: 'https://makamescopay.com/api/payments',
      apiKey: 'sk_ce0c6cbc05e5608674dbfc37d18c5b7d1e08d82f864520baa90caa4fe1d9e965'
    };

    // Generate a unique reference for this transaction
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const accountReference = `REF-${timestamp}-${randomStr}`;

    const payload = {
      phoneNumber: phone_number,          // e.g. "254712345678"
      amount: parseInt(amount),
      accountReference,
      transactionDesc: `Fuliza Limit Increase: Ksh ${parseInt(loan_amount || 0).toLocaleString()}`
    };

    const response = await fetch(`${MAKAMESCO_CONFIG.apiUrl}/stkpush`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MAKAMESCO_CONFIG.apiKey
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Makamesco STK push failed');
    }

    // Extract the checkoutRequestId – the reference we'll use to verify
    const checkoutRequestId = result.checkoutRequestId || result.reference || result.id;

    if (!checkoutRequestId) {
      throw new Error('No checkout reference returned from Makamesco');
    }

    res.status(200).json({
      success: true,
      reference: checkoutRequestId,
      external_reference: accountReference
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}