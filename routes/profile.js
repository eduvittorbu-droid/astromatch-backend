import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../services/cloudinary.js';
import pool from '../db.js';

const router = express.Router();

// Upload de foto
router.post('/upload-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  const userId = req.user.id;
  const { path, filename } = req.file;
  const count = await pool.query('SELECT COUNT(*) FROM photos WHERE user_id = $1', [userId]);
  if (count.rows[0].count >= 3) return res.status(400).json({ error: 'Máximo de 3 fotos atingido.' });
  await pool.query('INSERT INTO photos (user_id, url, cloudinary_public_id, order_index) VALUES ($1, $2, $3, $4)', [userId, path, filename, count.rows[0].count]);
  res.json({ url: path });
});

// Salvar preferências de busca
router.post('/search-prefs', authMiddleware, async (req, res) => {
  const { user_gender, age_min, age_max, seek_gender, goals } = req.body;
  await pool.query(
    `INSERT INTO search_prefs (user_id, user_gender, age_min, age_max, seek_gender, goals)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET user_gender=$2, age_min=$3, age_max=$4, seek_gender=$5, goals=$6`,
    [req.user.id, user_gender, age_min, age_max, seek_gender, goals]
  );
  res.json({ success: true });
});

export default router;
