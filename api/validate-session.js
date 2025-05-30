const Stripe = require('stripe');
const stripeConfig = require('../lib/stripeConfig.server');
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2022-11-15',
});

module.exports = async (req, res) => {
  console.log('Received request to /api/validate-session');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { session_id } = req.body;
  if (!session_id) {
    console.log('Missing session_id parameter');
    return res.status(400).json({ error: 'Missing session_id parameter', isValid: false });
  }

  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    // Validate that the payment was successful and it's a subscription
    const isValid = session && 
                   session.payment_status === 'paid' && 
                   session.mode === 'subscription';
    
    console.log(`Session ${session_id} validation result:`, { 
      isValid, 
      paymentStatus: session.payment_status,
      mode: session.mode
    });
    
    // Return the validation result
    res.status(200).json({ 
      isValid,
      paymentStatus: session.payment_status,
      mode: session.mode
    });
    
  } catch (err) {
    console.error('Error validating session:', err.message);
    res.status(500).json({ error: err.message, isValid: false });
  }
};