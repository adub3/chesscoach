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
  // White is up a queen, Black's turn
  const res = await fetchEval('rnb1kbnr/pppp1ppp/8/4p3/4P2Q/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3');
  console.log(res.eval);
}
test();
