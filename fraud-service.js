// fraud-service.js
const client = require('prom-client');
const axios = require('axios');

client.collectDefaultMetrics();
const fraudCounter = new client.Counter({
  name: 'payments_flagged_total',
  help: 'Total number of payments flagged for fraud'
});

setInterval(async () => {
  try {
    const { data } = await axios.get('http://localhost:3000/payments');
    for (const p of data) {
      if (p.status === 'VALIDATED') {
        const resp = await axios.put(`http://localhost:3000/payments/${p.transactionId}/fraud`);
        if (resp.data.status === 'FLAGGED') fraudCounter.inc();
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}, 5000);

console.log('FraudService running — polling every 5s');
