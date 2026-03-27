import { Chess } from 'chess.js';
const c = new Chess('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
const move = c.move({ from: 'f3', to: 'e5', promotion: 'q' });
console.log(move);
