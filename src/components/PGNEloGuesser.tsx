import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { ScrambleText } from './ScrambleText';
import { GameRecord } from '../services/chessComService';
import { analyzeGameWithCNN } from '../services/eloModelService';

export function PGNEloGuesser({ games }: { games?: GameRecord[] }) {
  const [pgn, setPgn] = useState('');
  const [selectedGameUrl, setSelectedGameUrl] = useState('');
  const [isGuessing, setIsGuessing] = useState(false);
  const [result, setResult] = useState<{ whiteElo: number; blackElo: number; explanation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGameUrl && games) {
      const game = games.find(g => g.url === selectedGameUrl);
      if (game) {
        setPgn(game.pgn);
      }
    }
  }, [selectedGameUrl, games]);

  const handleGuess = async () => {
    if (!pgn.trim()) {
      setError("Please enter a PGN.");
      return;
    }

    setIsGuessing(true);
    setError(null);
    setResult(null);

    try {
      // Use the CNN model for Elo guessing
      const analysis = await analyzeGameWithCNN(pgn);
      
      setResult({
        whiteElo: analysis.whiteElo,
        blackElo: analysis.blackElo,
        explanation: `CNN analysis suggests a skill level of ${analysis.whiteElo} for White and ${analysis.blackElo} for Black based on tactical patterns and positional understanding observed in the game.`
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while guessing the Elo.");
    } finally {
      setIsGuessing(false);
    }
  };

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center justify-between border-b border-black/10 pb-4 group">
        <div className="flex items-center gap-4">
          <h2 className="text-xl uppercase tracking-widest font-bold text-black"><ScrambleText text="CNN Elo Guesser" /></h2>
        </div>
      </div>
      
      <div className="p-6 md:p-8 border border-black/10 bg-black/5">
        <div className="flex flex-col gap-6">
          {games && games.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-black/40 font-bold">Select a Recent Game</label>
              <select
                value={selectedGameUrl}
                onChange={(e) => setSelectedGameUrl(e.target.value)}
                className="w-full bg-white border border-black/10 p-3 text-sm font-sans text-black focus:outline-none focus:border-indigo-600 transition-colors appearance-none"
              >
                <option value="">-- Or paste a PGN below --</option>
                {games.map((game, idx) => (
                  <option key={game.url || idx} value={game.url}>
                    vs {game.opponentName} ({game.timeControl}) - {new Date(game.endTime * 1000).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-black/40 font-bold">Paste PGN</label>
            <textarea
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              placeholder="[Event &quot;Live Chess&quot;]&#10;[Site &quot;Chess.com&quot;]&#10;..."
              className="w-full h-48 bg-white border border-black/10 p-4 text-sm font-mono text-black placeholder:text-black/20 focus:outline-none focus:border-indigo-600 transition-colors resize-y"
            />
          </div>
          
          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div className="flex justify-end">
            <button
              onClick={handleGuess}
              disabled={isGuessing || !pgn.trim()}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGuessing && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <span className="text-sm uppercase tracking-widest font-bold">
                {isGuessing ? "CNN Analyzing..." : "Guess Elo"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="p-8 flex flex-col gap-6 items-center justify-center text-center border border-black/20 bg-white">
            <span className="text-xs uppercase tracking-widest text-black/40 font-bold">White Elo Estimate</span>
            <span className="text-6xl font-mono text-black">{result.whiteElo}</span>
          </div>
          
          <div className="p-8 flex flex-col gap-6 items-center justify-center text-center border border-black/20 bg-white">
            <span className="text-xs uppercase tracking-widest text-black/40 font-bold">Black Elo Estimate</span>
            <span className="text-6xl font-mono text-black/60">{result.blackElo}</span>
          </div>

          <div className="p-6 md:col-span-2 flex flex-col gap-4 border border-black/20 bg-white">
            <span className="text-xs uppercase tracking-widest text-black/40 font-bold">CNN Analysis</span>
            <p className="text-sm text-black/80 leading-relaxed">
              {result.explanation}
            </p>
          </div>
        </motion.div>
      )}
    </section>
  );
}
