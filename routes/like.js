import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../db.js';

const router = express.Router();

router.post('/like/:targetId', authMiddleware, async (req, res) => {
  const fromId = req.user.id;
  const toId = parseInt(req.params.targetId);
  await pool.query('INSERT INTO likes (from_user_id, to_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [fromId, toId]);
  const mutual = await pool.query('SELECT id FROM likes WHERE from_user_id = $1 AND to_user_id = $2', [toId, fromId]);
  if (mutual.rows.length > 0) {
    const match = await pool.query('INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2) RETURNING id', [fromId, toId]);
    // Emitir evento via Socket.io (opcional, pode ser feito no frontend ao receber a resposta)
    res.json({ match: true, matchId: match.rows[0].id });
  } else {
    res.json({ match: false });
  }
});

export default router;
