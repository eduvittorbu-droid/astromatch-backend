import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../db.js';
import { calculateSynastry } from '../services/astrology.js';
import PDFDocument from 'pdfkit';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Inicia compra do relatório
router.post('/buy-report/:matchId', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const matchId = req.params.matchId;
  const match = await pool.query('SELECT * FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)', [matchId, userId]);
  if (match.rows.length === 0) return res.status(404).json({ error: 'Match não encontrado.' });
  const session = await stripe.checkout.sessions.create({
    customer_email: req.user.email,
    line_items: [{ price: process.env.STRIPE_PRICE_REPORT, quantity: 1 }],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/download-report/${matchId}`,
    cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
  });
  res.json({ url: session.url });
});

// Gera PDF (após pagamento)
router.get('/generate-report/:matchId', authMiddleware, async (req, res) => {
  const matchId = req.params.matchId;
  const match = await pool.query('SELECT user1_id, user2_id FROM matches WHERE id = $1', [matchId]);
  const user1 = await pool.query('SELECT name, astral_chart FROM users WHERE id = $1', [match.rows[0].user1_id]);
  const user2 = await pool.query('SELECT name, astral_chart FROM users WHERE id = $1', [match.rows[0].user2_id]);
  const synastry = calculateSynastry(user1.rows[0].astral_chart, user2.rows[0].astral_chart);
  
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);
  doc.fontSize(20).text('Relatório de Sinastria', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Entre ${user1.rows[0].name} e ${user2.rows[0].name}`);
  doc.text(`Compatibilidade total: ${synastry.totalScore}%`);
  doc.text(`Aspectos: ${synastry.aspects.join(', ')}`);
  doc.end();
});

export default router;
