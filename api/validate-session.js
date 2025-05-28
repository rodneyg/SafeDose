const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
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
    return res.status(400).json({ error: 'Missing session_id parameter' });
  }

  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    // Validate that the payment was successful
    const isValid = session.payment_status === 'paid';
    
    // Return the validation result
    res.status(200).json({ 
      isValid,
      paymentStatus: session.payment_status
    });
    
  } catch (err) {
    console.error('Error validating session:', err.message);
    res.status(500).json({ error: err.message });
  }
};