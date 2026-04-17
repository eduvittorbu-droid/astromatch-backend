import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { generateChart } from '../services/astrology.js';

const router = express.Router();

// 1. Cadastro inicial (antes do pagamento)
router.post('/register', async (req, res) => {
  const { cpf, email, password, termsAccepted, disclaimerAccepted, privacyAccepted, faceDescriptor } = req.body;
  if (!termsAccepted || !disclaimerAccepted || !privacyAccepted)
    return res.status(400).json({ error: 'Você deve aceitar todos os termos.' });
  
  const existing = await pool.query('SELECT id FROM users WHERE cpf = $1', [cpf]);
  if (existing.rows.length > 0) return res.status(400).json({ error: 'CPF já cadastrado.' });
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (cpf, email, password_hash, face_descriptor, terms_accepted, disclaimer_accepted, privacy_accepted, subscription_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'inactive') RETURNING id`,
    [cpf, email, hashedPassword, JSON.stringify(faceDescriptor), termsAccepted, disclaimerAccepted, privacyAccepted]
  );
  res.json({ userId: result.rows[0].id, message: 'Cadastro inicial concluído. Prossiga para o pagamento.' });
});

// 2. Ativação da assinatura (chamada após pagamento ou via webhook)
router.post('/activate-subscription', async (req, res) => {
  const { userId } = req.body;
  const user = await pool.query('SELECT cpf FROM users WHERE id = $1', [userId]);
  if (user.rows[0].cpf === process.env.TEST_CPF) {
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
    await pool.query('UPDATE users SET subscription_status = $1, subscription_expires_at = $2 WHERE id = $3', ['active', expiresAt, userId]);
    return res.json({ success: true, message: 'Assinatura ativada (modo teste).' });
  }
  // Para usuários reais, o webhook do Stripe atualizará o status.
  res.json({ success: true });
});

// 3. Completar perfil (após pagamento aprovado)
router.post('/complete-profile', async (req, res) => {
  const { userId, name, birthDate, birthTime, birthCity, birthState, birthCountry } = req.body;
  // Verificar idade >= 18
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  if (age < 18) return res.status(400).json({ error: 'Você deve ter 18 anos ou mais.' });
  
  let astralChart;
  try {
    astralChart = await generateChart({ birthDate, birthTime, birthCity, birthState, birthCountry });
  } catch (err) {
    return res.status(400).json({ error: 'Erro ao gerar mapa astral. Verifique a localidade.' });
  }
  
  await pool.query(
    `UPDATE users SET name=$1, birth_date=$2, birth_time=$3, birth_city=$4, birth_state=$5, birth_country=$6, latitude=$7, longitude=$8, astral_chart=$9
     WHERE id=$10`,
    [name, birthDate, birthTime, birthCity, birthState, birthCountry, astralChart.lat, astralChart.lng, JSON.stringify(astralChart), userId]
  );
  res.json({ success: true, chart: astralChart });
});

// 4. Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas.' });
  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas.' });
  const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

export default router;
