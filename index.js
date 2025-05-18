// index.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const client = require('prom-client');

const app = express();
app.use(express.json());

// Metrics setup
client.collectDefaultMetrics();
const paymentCounter = new client.Counter({
  name: 'payments_created_total',
  help: 'Total number of payments initiated'
});
const paymentStatusHistogram = new client.Histogram({
  name: 'payment_process_duration_seconds',
  help: 'Time taken to process payment lifecycle',
  buckets: [0.1, 0.5, 1, 2, 5]
});

// In-memory store
const payments = {};

// 1) Health check
app.get('/', (req, res) => res.send('Server is live!'));

// 2) Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// 3) List all payments
app.get('/payments', (req, res) => {
  res.json(Object.values(payments));
});

// 4) Initiate a new payment
app.post('/payments', async (req, res) => {
  const start = Date.now();
  const { requestId, userId, merchantId, amount, currency, paymentMethod } = req.body;
  if (payments[requestId]) {
    return res.json(payments[requestId]);
  }
  paymentCounter.inc();
  const transactionId = uuidv4();
  const rec = {
    requestId,
    transactionId,
    userId,
    merchantId,
    amount,
    currency,
    paymentMethod,
    status: 'PENDING',
    message: 'Processing'
  };
  payments[requestId] = rec;
  const duration = (Date.now() - start) / 1000;
  paymentStatusHistogram.observe(duration);
  res.json(rec);
});

// 5) Get status of a single payment
app.get('/payments/:transactionId', (req, res) => {
  const { transactionId } = req.params;
  const rec = Object.values(payments).find(r => r.transactionId === transactionId);
  if (!rec) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(rec);
});

// 6) Validate payment
app.put('/payments/:transactionId/validate', (req, res) => {
  const { transactionId } = req.params;
  const rec = Object.values(payments).find(r => r.transactionId === transactionId);
  if (!rec) {
    return res.status(404).json({ error: 'Not found' });
  }
  rec.status = 'VALIDATED';
  rec.message = 'Payment validated';
  res.json(rec);
});

// 7) Fraud detection
app.put('/payments/:transactionId/fraud', (req, res) => {
  const { transactionId } = req.params;
  const rec = Object.values(payments).find(r => r.transactionId === transactionId);
  if (!rec) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (rec.amount > 100) {
    rec.status = 'FLAGGED';
    rec.message = 'Potential fraud';
  } else {
    rec.status = 'CLEARED';
    rec.message = 'No fraud';
  }
  res.json(rec);
});

// 8) Settle payment
app.put('/payments/:transactionId/settle', (req, res) => {
  const { transactionId } = req.params;
  const rec = Object.values(payments).find(r => r.transactionId === transactionId);
  if (!rec) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (rec.status !== 'CLEARED') {
    return res.status(400).json({ error: 'Cannot settle unless CLEARED' });
  }
  rec.status = 'SETTLED';
  rec.message = 'Payment settled';
  rec.settledAt = new Date().toISOString();
  res.json(rec);
});

// 9) Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));