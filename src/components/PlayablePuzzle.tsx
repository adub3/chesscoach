import React, { useState, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { stockfish, StockfishResponse } from '../services/stockfishService';
import { Loader2, Play, RotateCcw, MousePointer2, Cpu } from 'lucide-react';

interface PlayablePuzzleProps {
  fen: string;
  solutionMoves: string[];
  customArrows?: { start: string; end: string; color: string }[];
  customHighlights?: { square: string; color: string }[];
}

export const PlayablePuzzle: React.FC<PlayablePuzzleProps> = ({ 
  fen, 
  solutionMoves,
  customArrows = [],
  customHighlights = []
}) => {
  const [currentFen, setCurrentFen] = useState(fen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'correct' | 'incorrect'>('playing');
  const [mode, setMode] = useState<'puzzle' | 'engine' | 'freeplay'>('puzzle');
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const [mate, setMate] = useState<number | null>(null);
  const [bestEngineMove, setBestEngineMove] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintArrow, setHintArrow] = useState<{ startSquare: string, endSquare: string, color: string } | null>(null);
  const [customSquares, setCustomSquares] = useState<any>({});

  // Reset puzzle when FEN changes
  useEffect(() => {
    setCurrentFen(fen);
    setMoveIndex(0);
    setStatus('playing');
    setMode('puzzle');
    setFeedback(null);
    setHint(null);
    setHintArrow(null);
    setCustomSquares({});
  }, [fen]);

  // Update custom squares when highlights change
  useEffect(() => {
    const squares: any = {};
    customHighlights.forEach(h => {
      squares[h.square] = { backgroundColor: h.color };
    });
    setCustomSquares(squares);
  }, [customHighlights]);

  const onDrop = useCallback(async (args: any) => {
    const { sourceSquare, targetSquare } = args;
    if (status === 'incorrect') return false;
    if (!targetSquare) return false;

    try {
      const gameCopy = new Chess(currentFen);
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      if (mode === 'freeplay') {
        setCurrentFen(gameCopy.fen());
        setFeedback('Freeplay mode. You control all pieces.');
        
        // Get evaluation for freeplay
        stockfish.getAnalysis(gameCopy.fen()).then(res => {
          setEvaluation(res.evaluation);
          setMate(res.mate);
          setBestEngineMove(res.bestMove);
        });
        return true;
      }

      if (mode === 'engine') {
        setCurrentFen(gameCopy.fen());
        setIsEngineThinking(true);
        setFeedback('Engine is thinking...');
        
        // Let engine play
        const analysis = await stockfish.getAnalysis(gameCopy.fen());
        setEvaluation(analysis.evaluation);
        setMate(analysis.mate);
        setBestEngineMove(analysis.bestMove);
        
        if (analysis.bestMove) {
          gameCopy.move(analysis.bestMove);
          setCurrentFen(gameCopy.fen());
          
          // Get new evaluation after engine move
          const nextAnalysis = await stockfish.getAnalysis(gameCopy.fen());
          setEvaluation(nextAnalysis.evaluation);
          setMate(nextAnalysis.mate);
          setBestEngineMove(nextAnalysis.bestMove);
        }
        setIsEngineThinking(false);
        setFeedback('Your turn.');
        return true;
      }

      // Puzzle mode logic
      if (status !== 'playing') return false;
      const expectedMoveSan = solutionMoves[moveIndex];
      
      if (move.san === expectedMoveSan) {
        setCurrentFen(gameCopy.fen());
        const nextIndex = moveIndex + 1;
        setMoveIndex(nextIndex);
        
        if (nextIndex >= solutionMoves.length) {
          setStatus('correct');
          setFeedback('Excellent! Sequence complete.');
          setHint(null);
          setHintArrow(null);
        } else {
          setFeedback('Correct! Keep going...');
          setHint(null);
          setHintArrow(null);
          
          // Opponent's turn
          setTimeout(() => {
            const nextGame = new Chess(gameCopy.fen());
            const opponentMoveSan = solutionMoves[nextIndex];
            try {
              nextGame.move(opponentMoveSan);
              setCurrentFen(nextGame.fen());
            } catch (e) {
              console.error('Opponent move failed:', opponentMoveSan);
            }
            
            const nextUserIndex = nextIndex + 1;
            setMoveIndex(nextUserIndex);
            
            if (nextUserIndex >= solutionMoves.length) {
              setStatus('correct');
              setFeedback('Excellent! Sequence complete.');
            } else {
              setFeedback('Your turn again.');
            }
          }, 600);
        }
        return true;
      } else {
        setStatus('incorrect');
        setFeedback(`Not quite. The engine preferred ${expectedMoveSan}.`);
        return false; 
      }
    } catch (e) {
      console.error('Move error:', e);
      return false;
    }
  }, [currentFen, moveIndex, solutionMoves, status, mode]);

  const resetPuzzle = () => {
    setCurrentFen(fen);
    setMoveIndex(0);
    setStatus('playing');
    setMode('puzzle');
    setFeedback(null);
    setHint(null);
    setHintArrow(null);
  };

  const startEngineMode = () => {
    setMode('engine');
    setStatus('playing');
    setFeedback('Playing against Stockfish. Your turn.');
    // Initial analysis
    stockfish.getAnalysis(currentFen).then(res => {
      setEvaluation(res.evaluation);
      setMate(res.mate);
      setBestEngineMove(res.bestMove);
    });
  };

  const startFreeplayMode = () => {
    setMode('freeplay');
    setStatus('playing');
    setFeedback('Freeplay mode. You control all pieces.');
    // Initial analysis
    stockfish.getAnalysis(currentFen).then(res => {
      setEvaluation(res.evaluation);
      setMate(res.mate);
      setBestEngineMove(res.bestMove);
    });
  };

  const handleHint = () => {
    if (status === 'playing' && moveIndex < solutionMoves.length) {
      const expectedMoveSan = solutionMoves[moveIndex];
      const gameCopy = new Chess(currentFen);
      try {
        const moveObj = gameCopy.move(expectedMoveSan);
        if (moveObj) {
          setHintArrow({
            startSquare: moveObj.from,
            endSquare: moveObj.to,
            color: 'rgba(99, 102, 241, 0.5)'
          });
        }
      } catch (e) {
        console.error('Hint error:', e);
      }
      setHint(`Hint: Move ${expectedMoveSan}`);
    }
  };

  let orientation: 'white' | 'black' = 'white';
  try {
    orientation = new Chess(fen).turn() === 'b' ? 'black' : 'white';
  } catch (e) {
    // Fallback if FEN is invalid
  }

  // Use a dynamic ID based on the initial FEN to force react-chessboard to completely reset its internal state
  const boardId = `puzzle-${fen.replace(/[^a-zA-Z0-9]/g, '')}`;

  const allArrows = mode === 'puzzle' ? [
    ...(hintArrow ? [hintArrow] : []),
    ...customArrows.map(a => ({ startSquare: a.start, endSquare: a.end, color: a.color }))
  ] : [];

  // Calculate eval bar percentage
  const getEvalPercentage = () => {
    if (mate !== null) {
      return mate > 0 ? 100 : 0;
    }
    if (evaluation === null) return 50;
    // Map -5 to 5 range to 0 to 100
    const clamped = Math.max(-5, Math.min(5, evaluation));
    return ((clamped + 5) / 10) * 100;
  };

  const evalPercentage = getEvalPercentage();

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="relative flex-1 aspect-square mx-auto w-full max-w-[500px] flex gap-4">
        {/* Eval Bar */}
        {(mode === 'engine' || mode === 'freeplay') && (
          <div className="w-4 bg-black/10 rounded-full overflow-hidden relative border border-black/5 h-full">
            <motion.div 
              initial={{ height: '50%' }}
              animate={{ height: `${evalPercentage}%` }}
              className="absolute bottom-0 left-0 right-0 bg-black transition-all duration-500"
            />
            <div className="absolute inset-0 flex flex-col justify-between items-center py-2 pointer-events-none">
              <span className="text-[8px] font-bold text-white mix-blend-difference">+</span>
              <span className="text-[8px] font-bold text-white mix-blend-difference">-</span>
            </div>
          </div>
        )}

        <div className="rounded-lg overflow-hidden border border-black/20 shadow-xl flex-1 h-full bg-white relative">
          <Chessboard 
            options={{
              id: boardId,
              position: currentFen,
              onPieceDrop: onDrop,
              boardOrientation: orientation,
              darkSquareStyle: { backgroundColor: '#779556' },
              lightSquareStyle: { backgroundColor: '#ebecd0' },
              animationDurationInMs: 200,
              arrows: allArrows,
              squareStyles: customSquares
            }}
          />
        </div>
        
        <AnimatePresence>
          {status === 'correct' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-900/80 flex flex-col items-center justify-center backdrop-blur-sm z-10 p-8 text-center"
            >
              <span className="text-xl font-bold text-white tracking-widest uppercase mb-2">Solved!</span>
              <p className="text-white/70 text-sm mb-8">You've mastered this position. Want to see how it plays out against the engine?</p>
              
              <div className="flex flex-col gap-3 w-full max-w-[240px]">
                <button 
                  onClick={startEngineMode}
                  className="flex items-center justify-center gap-2 text-sm text-white font-bold uppercase tracking-widest border border-white bg-white/10 hover:bg-white hover:text-emerald-900 transition-all px-6 py-3"
                >
                  <Cpu className="w-4 h-4" />
                  Play vs Engine
                </button>
                <button 
                  onClick={startFreeplayMode}
                  className="flex items-center justify-center gap-2 text-sm text-white font-bold uppercase tracking-widest border border-white/20 bg-white/5 hover:bg-white/10 transition-all px-6 py-3"
                >
                  <MousePointer2 className="w-4 h-4" />
                  Freeplay Mode
                </button>
                <button 
                  onClick={resetPuzzle}
                  className="flex items-center justify-center gap-2 text-xs text-white/50 hover:text-white transition-colors px-4 py-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Puzzle
                </button>
              </div>
            </motion.div>
          )}
          
          {status === 'incorrect' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center backdrop-blur-sm z-10"
            >
              <span className="text-xl font-bold text-white tracking-widest uppercase">Incorrect</span>
              <button 
                onClick={resetPuzzle}
                className="mt-6 flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors border border-white/20 bg-white/10 px-4 py-2"
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-between items-center bg-white border border-black/20 p-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-black/40 font-bold">
              {mode === 'engine' ? 'Engine Mode' : mode === 'freeplay' ? 'Freeplay Mode' : 'Puzzle Mode'}
            </span>
            {isEngineThinking && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
            {(mode === 'engine' || mode === 'freeplay') && evaluation !== null && (
              <span className="text-[10px] font-mono font-bold text-indigo-600">
                {mate !== null ? `M${Math.abs(mate)}` : (evaluation > 0 ? `+${evaluation.toFixed(1)}` : evaluation.toFixed(1))}
              </span>
            )}
            {(mode === 'engine' || mode === 'freeplay') && bestEngineMove && (
              <span className="text-[10px] font-mono font-bold text-black/40 ml-2">
                Best: {bestEngineMove}
              </span>
            )}
          </div>
          <span className={`text-sm font-mono ${
            status === 'correct' ? 'text-emerald-500' : 
            status === 'incorrect' ? 'text-red-500' : 
            mode !== 'puzzle' ? 'text-indigo-600' :
            'text-black'
          }`}>
            {feedback || (status === 'playing' ? 'Your Turn' : '')}
          </span>
          {hint && mode === 'puzzle' && (
            <span className="text-xs font-mono text-indigo-600">{hint}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {mode === 'puzzle' ? (
            <>
              <button 
                onClick={startFreeplayMode}
                className="text-black/40 hover:text-black transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold"
              >
                Freeplay
              </button>
              <button 
                onClick={handleHint} 
                disabled={status !== 'playing'}
                className="text-indigo-600/60 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-indigo-600/60 transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold"
              >
                Hint
              </button>
            </>
          ) : (
            <button 
              onClick={resetPuzzle} 
              className="text-indigo-600/60 hover:text-indigo-600 transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold"
            >
              Back to Puzzle
            </button>
          )}
          <button 
            onClick={resetPuzzle} 
            className="text-black/40 hover:text-black transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
