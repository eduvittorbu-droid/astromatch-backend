mport express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../db.js';
import { calculateSynastry } from '../services/astrology.js';

const router = express.Router();

router.get('/candidates', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const prefs = await pool.query('SELECT * FROM search_prefs WHERE user_id = $1', [userId]);
  if (prefs.rows.length === 0) return res.status(400).json({ error: 'Configure suas preferências primeiro.' });
  
  const { age_min, age_max, seek_gender, goals } = prefs.rows[0];
  // Buscar outros usuários ativos com perfil completo
  const candidates = await pool.query(`
    SELECT u.id, u.name, u.birth_date, u.astral_chart, p.url as photo
    FROM users u
    LEFT JOIN photos p ON u.id = p.user_id AND p.order_index = 0
    WHERE u.id != $1 AND u.subscription_status = 'active' AND u.astral_chart IS NOT NULL
      AND u.birth_date <= NOW() - INTERVAL '18 years'
      AND EXTRACT(YEAR FROM age(NOW(), u.birth_date)) BETWEEN $2 AND $3
      AND u.gender = ANY($4)
    LIMIT 50
  `, [userId, age_min, age_max, seek_gender === 'both' ? ['male', 'female'] : [seek_gender]]);
  
  const results = [];
  for (const cand of candidates.rows) {
    const synastry = calculateSynastry(user.rows[0].astral_chart, cand.astral_chart);
    results.push({ id: cand.id, name: cand.name, photo: cand.photo, synastry });
  }
  res.json(results);
});

export default router;
