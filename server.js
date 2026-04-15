import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/', (req, res) => {
  res.json({ message: 'AstroMatch API rodando!' });
});

app.post('/api/astro/generate', (req, res) => {
  const { birthDate, birthTime, birthCity } = req.body;
  
  const mockChart = {
    sun: { sign: 'Áries', degree: 15 },
    moon: { sign: 'Leão', degree: 22 },
    mercury: { sign: 'Touro', degree: 8 },
    venus: { sign: 'Gêmeos', degree: 12 },
    mars: { sign: 'Câncer', degree: 5 }
  };
  
  res.json({ 
    success: true, 
    chart: mockChart,
    message: `Mapa astral gerado para ${birthCity}`
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AstroMatch rodando na porta ${PORT}`);
});


