import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json({ limit: '1mb' }));

const APP_VERSION = process.env.APP_VERSION || 'dev';
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString();
const memoryLog = [];

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    buildDate: BUILD_DATE,
    dbReady: true,
    lastSyncAt: memoryLog[0]?.at || null,
    logCount: memoryLog.length,
  });
});

app.get('/api/time', (_req, res) => {
  res.json({ iso: new Date().toISOString() });
});

app.post('/api/log', (req, res) => {
  const row = {
    at: new Date().toISOString(),
    payload: req.body || {},
  };
  memoryLog.unshift(row);
  if (memoryLog.length > 500) memoryLog.length = 500;
  res.json({ ok: true, stored: memoryLog.length });
});

app.post('/api/hybrid-chat', async (req, res) => {
  const { question, context } = req.body || {};
  if (!process.env.LLM_API_KEY) {
    return res.status(503).json({ error: 'LLM backend non configuré (.env manquant).' });
  }
  return res.json({ answer: `Mode hybride stub. Question reçue: ${question}`, contextUsed: context?.length || 0 });
});

app.listen(process.env.PORT || 8787, () => console.log('Hybrid server ready'));
