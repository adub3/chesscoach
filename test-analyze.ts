import { analyzeChessGames } from './src/services/geminiService.ts';

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

1. d4 d5 2. c4 Nc6 3. cxd5 Nb8 4. Nc3 e6 5. e4 exd5 6. Nxd5 c6 7. Nc3 Bd6 8. Nf3 Nf6 9. e5`;
  
  const res = await analyzeChessGames(pgn, 'sakan1');
  console.log(JSON.stringify(res, null, 2));
}
test();
