// settlement-service.js
const client = require('prom-client');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

client.collectDefaultMetrics();
const settleCounter = new client.Counter({
  name: 'payments_settled_total',
  help: 'Total number of payments settled'
});

const db = new sqlite3.Database('./settlements.db');
db.run(`CREATE TABLE IF NOT EXISTS settlements (
  transactionId TEXT PRIMARY KEY, requestId TEXT, amount REAL, settledAt TEXT )`);

setInterval(async () => {
  try {
    const { data } = await axios.get('http://localhost:3000/payments');
    for (const p of data) {
      if (p.status === 'CLEARED') {
        await axios.put(`http://localhost:3000/payments/${p.transactionId}/settle`);
        db.run(
          `INSERT OR IGNORE INTO settlements VALUES (?,?,?,?)`,
          [p.transactionId, p.requestId, p.amount, new Date().toISOString()]
        );
        settleCounter.inc();
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}, 5000);

console.log('SettlementService running — polling every 5s');
