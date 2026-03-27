import { fetchChessComGames } from './src/services/chessComService.ts';

async function test() {
  const { pgnsForAnalysis } = await fetchChessComGames('sakan1', 5);
  console.log(pgnsForAnalysis.substring(0, 1000));
}
test();
