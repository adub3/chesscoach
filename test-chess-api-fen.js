import https from 'https';
import { Chess } from 'chess.js';

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
  const pgn = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.03.11"]
[Round "-"]
[White "GoodFella7"]
[Black "sakan1"]
[Result "1-0"]
[WhiteElo "758"]
[BlackElo "740"]
[TimeControl "60+1"]
[Termination "GoodFella7 won by checkmate"]

1. d4 d5 2. c4 Nc6 3. cxd5 Nb8 4. Nc3 e6 5. e4 exd5 6. Nxd5 c6 7. Nc3 Bd6 8. Nf3`;
  
  const chess = new Chess();
  chess.loadPgn(pgn);
  const fen = chess.fen();
  console.log('FEN:', fen);
  const res = await fetchEval(fen);
  console.log('Best move:', res.move);
  console.log('Continuation:', res.continuationArr);
}
test();
