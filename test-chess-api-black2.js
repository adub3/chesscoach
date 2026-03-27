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
  const res = await fetchEval('r1bqkbnr/ppp1pppp/2n5/3P4/3P4/8/PP2PPPP/RNBQKBNR b KQkq - 0 3');
  console.log(res.eval);
}
test();
