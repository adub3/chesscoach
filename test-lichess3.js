import https from 'https';

function fetchLichessEval(fen) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'lichess.org',
      port: 443,
      path: '/api/cloud-eval?fen=' + encodeURIComponent(fen),
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
    req.end();
  });
}

async function test() {
  const res = await fetchLichessEval('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
  console.log(res);
  const res2 = await fetchLichessEval('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3 b - - 0 1'); // slightly modified
  console.log(res2);
  const res3 = await fetchLichessEval('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3 b - - 0 1 123'); // invalid
  console.log(res3);
  const res4 = await fetchLichessEval('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3 b - - 0 1 123 123'); // invalid
  console.log(res4);
  const res5 = await fetchLichessEval('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3 b - - 0 1 123 123 123'); // invalid
  console.log(res5);
  const res6 = await fetchLichessEval('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3 b - - 0 1 123 123 123 123'); // invalid
  console.log(res6);
}
test();
