// validation-service.js
const client = require('prom-client');
const axios = require('axios');

client.collectDefaultMetrics();
const validateCounter = new client.Counter({
  name: 'payments_validated_total',
  help: 'Total number of payments validated'
});

setInterval(async () => {
  try {
    const { data } = await axios.get('http://localhost:3000/payments');
    for (const p of data) {
      if (p.status === 'PENDING') {
        await axios.put(`http://localhost:3000/payments/${p.transactionId}/validate`);
        validateCounter.inc();
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}, 5000);

console.log('ValidationService running — polling every 5s');
