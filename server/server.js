import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/api/hybrid-chat', async (req, res) => {
  const { question, context } = req.body || {};
  if (!process.env.LLM_API_KEY) {
    return res.status(503).json({ error: 'LLM backend non configuré (.env manquant).' });
  }
  return res.json({ answer: `Mode hybride stub. Question reçue: ${question}`, contextUsed: context?.length || 0 });
});

app.listen(process.env.PORT || 8787, () => console.log('Hybrid server ready'));
