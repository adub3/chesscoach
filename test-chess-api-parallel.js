import https from 'https';

function fetchEval(fen) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ fen });
    const options = {
      hostname: 'chess-api.com',
      port: 443,
      path: '/v1',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function test() {
  const start = Date.now();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(fetchEval('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'));
  }
  await Promise.all(promises);
  console.log('10 requests took', Date.now() - start, 'ms');
}
test();
