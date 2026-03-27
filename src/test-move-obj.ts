import { Chess } from 'chess.js';
const c = new Chess();
const history = c.history({ verbose: true });
c.move('e4');
const moveObj = c.history({ verbose: true })[0];
const tempChess = new Chess();
const result = tempChess.move(moveObj);
console.log(result);
