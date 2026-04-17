import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payment.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Monta as rotas com prefixo /api
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Backend rodando na porta ${PORT}`));
