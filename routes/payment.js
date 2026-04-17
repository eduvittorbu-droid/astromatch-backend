import express from 'express';
import Stripe from 'stripe';
import pool from '../db.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Cria sessão de checkout para assinatura mensal
router.post('/create-checkout', async (req, res) => {
  const { userId, cpf, email, name } = req.body;
  // Se for CPF de teste, ativa diretamente sem Stripe
  if (cpf === process.env.TEST_CPF) {
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
    await pool.query('UPDATE users SET subscription_status = $1, subscription_expires_at = $2 WHERE id = $3', ['active', expiresAt, userId]);
    return res.json({ url: `${process.env.FRONTEND_URL}/complete-profile?userId=${userId}` });
  }
  
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    client_reference_id: userId,
    line_items: [{ price: process.env.STRIPE_PRICE_MONTHLY, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.FRONTEND_URL}/complete-profile?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
  });
  res.json({ url: session.url });
});

// Webhook do Stripe (para confirmar pagamentos reais)
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
    await pool.query('UPDATE users SET subscription_status = $1, subscription_expires_at = $2 WHERE id = $3', ['active', expiresAt, userId]);
  }
  res.json({ received: true });
});

export default router;
