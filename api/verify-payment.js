// api/verify-payment.js
import { MEGAPAY_CONFIG } from './megapay-config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

    // The reference here is the transaction_request_id from initiation
    const payload = {
      api_key: MEGAPAY_CONFIG.apiKey,
      email: MEGAPAY_CONFIG.email,
      transaction_request_id: reference
    };

    const response = await fetch(`${MEGAPAY_CONFIG.baseUrl}/backend/v1/transactionstatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Payment verification failed');
    }

    // Map MegaPay status to our internal status
    // You may need to adjust based on actual response fields
    // From sample, the response might have a "status" field like "completed", "pending", etc.
    const statusMap = {
      'completed': 'COMPLETED',
      'success': 'SUCCESS',
      'paid': 'COMPLETED',
      'pending': 'PENDING',
      'failed': 'FAILED',
      'cancelled': 'CANCELLED'
    };
    const mappedStatus = statusMap[result.status?.toLowerCase()] || result.status;

    res.status(200).json({
      success: true,
      status: mappedStatus,
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