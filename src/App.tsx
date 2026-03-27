import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ScrambleText } from './components/ScrambleText';
import { analyzeChessGames, ChessAnalysisResult, batchAnalyzeGames } from './services/geminiService';
import { fetchChessComGames, PlayerStats, GameRecord } from './services/chessComService';
import { HomePage, AnalysisTimeframe } from './pages/HomePage';
import { PuzzlesPage } from './pages/PuzzlesPage';
import { TechnicalSpecsPage } from './pages/TechnicalSpecsPage';
import { AboutPage } from './pages/AboutPage';
import { Header } from './components/Header';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const [usernameInput, setUsernameInput] = useState('sakan1');
  const [analysisTimeframe, setAnalysisTimeframe] = useState<AnalysisTimeframe>('last7Days');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [results, setResults] = useState<ChessAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!usernameInput.trim()) {
      setError("Please provide a Chess.com username.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setResults(null);
    setPlayerStats(null);
    setGames([]);
    try {
      setStatusText('Fetching games from Chess.com...');
      const { pgnsForAnalysis, stats, games: fetchedGames } = await fetchChessComGames(usernameInput.trim(), 50, analysisTimeframe);
      
      setStatusText('Running diagnostic engine...');
      const diagnosticData = await analyzeChessGames(pgnsForAnalysis, usernameInput.trim());

      // Automatically analyze recent games with AI for Elo and Accuracy
      const gamesToAiAnalyze = fetchedGames.slice(0, 20); // Analyze top 20 games
      
      const mapAnalysisToGame = (game: GameRecord, analysis: any) => {
        const isWhite = game.playerColor === 'white';
        return {
          ...game,
          aiEloGuess: isWhite ? analysis.whiteEloMean : analysis.blackEloMean,
          aiOpponentEloGuess: isWhite ? analysis.blackEloMean : analysis.whiteEloMean,
          aiEloLower: isWhite ? analysis.whiteEloLower : analysis.blackEloLower,
          aiEloUpper: isWhite ? analysis.whiteEloUpper : analysis.blackEloUpper,
          aiOpponentEloLower: isWhite ? analysis.blackEloLower : analysis.whiteEloLower,
          aiOpponentEloUpper: isWhite ? analysis.blackEloUpper : analysis.whiteEloUpper,
          aiAccuracy: isWhite ? analysis.whiteAccuracy : analysis.blackAccuracy,
          aiOpponentAccuracy: isWhite ? analysis.blackAccuracy : analysis.whiteAccuracy
        };
      };

      if (gamesToAiAnalyze.length > 0) {
        // Split into initial threshold (10) and background
        const first10 = gamesToAiAnalyze.slice(0, 10);
        const remaining = gamesToAiAnalyze.slice(10);

        setStatusText(`CNN evaluating initial ${first10.length} games...`);
        const first10Analyses = await batchAnalyzeGames(first10.map(g => ({ url: g.url, pgn: g.pgn })));
        
        const initialGames = fetchedGames.map(game => {
          const analysis = first10Analyses.find(a => a.gameUrl === game.url);
          return analysis ? mapAnalysisToGame(game, analysis) : game;
        });

        // UNLOCK UI: Show data after first 10 are ready
        setPlayerStats(stats);
        setGames(initialGames);
        setResults(diagnosticData);

        if (remaining.length > 0) {
          setStatusText(`CNN analyzing remaining ${remaining.length} games in background...`);
          // Background analysis - don't await this so UI stays responsive
          batchAnalyzeGames(remaining.map(g => ({ url: g.url, pgn: g.pgn }))).then(remainingAnalyses => {
            setGames(prevGames => prevGames.map(game => {
              const analysis = remainingAnalyses.find(a => a.gameUrl === game.url);
              return analysis ? mapAnalysisToGame(game, analysis) : game;
            }));
            setStatusText('');
          }).catch(err => {
            console.error("Background analysis failed:", err);
            setStatusText('');
          });
        } else {
          setStatusText('');
        }
      } else {
        // No games to analyze, show diagnostic results immediately
        setPlayerStats(stats);
        setGames(fetchedGames);
        setResults(diagnosticData);
        setStatusText('');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setUsernameInput('');
    setPlayerStats(null);
    setGames([]);
    setResults(null);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full relative selection:bg-indigo-500/30">
      <ScrollToTop />
      <Header />
      <main className="relative z-10 w-full max-w-7xl mx-auto px-8 md:px-16 py-16 md:py-24 flex flex-col gap-32">
        <Routes>
              <Route 
              path="/diagnostics" 
              element={
                <HomePage 
                  usernameInput={usernameInput}
                  setUsernameInput={setUsernameInput}
                  analysisTimeframe={analysisTimeframe}
                  setAnalysisTimeframe={setAnalysisTimeframe}
                  isAnalyzing={isAnalyzing}
                  statusText={statusText}
                  error={error}
                  handleAnalyze={handleAnalyze}
                  playerStats={playerStats}
                  results={results}
                  games={games}
                  onReset={handleReset}
                />
              } 
            />
            <Route 
              path="/puzzles" 
              element={<PuzzlesPage results={results} />} 
            />
            <Route 
              path="/about" 
              element={<TechnicalSpecsPage />} 
            />
            <Route 
              path="/" 
              element={<AboutPage />} 
            />
        </Routes>
        
        <footer className="mt-32 border-t border-black/10 pt-16 pb-24 flex justify-center items-center text-sm text-black/40 uppercase tracking-widest text-center w-full">
          <span>&copy; {new Date().getFullYear()} Chess Diagnostics</span>
        </footer>
      </main>
    </div>
  );
}
