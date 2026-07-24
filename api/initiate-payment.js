// pages/api/initiate-payment.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone_number, amount, loan_amount, id_number } = req.body;

    if (!phone_number || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ─── HASHAY CREDENTIALS ──────────────────────────────────────────
    const HASHAY_CONFIG = {
      apiUrl: 'https://hashpay.stkpush.co.ke/api/stk-push/',
      apiKey: '26e93309d4cb8ca04065b06babe4b386c4984990ff495386010b97e315751de5',
      accountId: 'HP016047'
    };

    // Generate a unique reference for this transaction
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const accountReference = `REF-${timestamp}-${randomStr}`;

    const payload = {
      phone_number: phone_number,
      amount: parseInt(amount),
      reference: accountReference,
      platform: 'fuliza-boost',
      api_key: HASHAY_CONFIG.apiKey,
      account_id: HASHAY_CONFIG.accountId
    };

    const response = await fetch(HASHAY_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'HashPay STK push failed');
    }

    // Log full response for debugging
    console.log('HashPay Initiate Response:', JSON.stringify(result, null, 2));

    // Extract the checkout reference – try multiple fields
    const checkoutRequestId =
      result.payhero_reference ||
      result.reference ||
      result.transaction_id ||
      result.data?.reference ||
      result.data?.payhero_reference ||
      result.merchant_reference ||
      accountReference;

    if (!checkoutRequestId) {
      throw new Error('No checkout reference returned from HashPay');
    }

    res.status(200).json({
      success: true,
      reference: checkoutRequestId,          // use this for verification
      external_reference: accountReference, // fallback if needed
      raw_response: result                  // for debugging
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}