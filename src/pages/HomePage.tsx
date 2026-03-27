import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ScrambleText } from '../components/ScrambleText';
import { PGNEloGuesser } from '../components/PGNEloGuesser';
import { Loader2 } from 'lucide-react';
import { ChessAnalysisResult } from '../services/geminiService';
import { PlayerStats, GameRecord } from '../services/chessComService';
import { EloConfidenceChart } from '../components/EloConfidenceChart';

export type AnalysisTimeframe = 'lastHour' | 'last24Hours' | 'last7Days' | 'last30Days';

interface HomePageProps {
  usernameInput: string;
  setUsernameInput: (val: string) => void;
  analysisTimeframe: AnalysisTimeframe;
  setAnalysisTimeframe: (val: AnalysisTimeframe) => void;
  isAnalyzing: boolean;
  statusText: string;
  error: string | null;
  handleAnalyze: () => void;
  playerStats: PlayerStats | null;
  results: ChessAnalysisResult | null;
  games: GameRecord[];
  onReset: () => void;
}

export function HomePage({
  usernameInput,
  setUsernameInput,
  analysisTimeframe,
  setAnalysisTimeframe,
  isAnalyzing,
  statusText,
  error,
  handleAnalyze,
  playerStats,
  results,
  games,
  onReset
}: HomePageProps) {
  const [timeframe, setTimeframe] = useState<AnalysisTimeframe>('last7Days');
  const [bulletSliderValue, setBulletSliderValue] = useState(0);
  const [isBulletModalOpen, setIsBulletModalOpen] = useState(false);
  const [selectedGameForChart, setSelectedGameForChart] = useState<GameRecord | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  const handleLegendClick = (e: any) => {
    const { dataKey } = e;
    setHiddenSeries(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const timeframeLabels: Record<AnalysisTimeframe, string> = {
    lastHour: 'past hour',
    last24Hours: 'past 24 hours',
    last7Days: 'past 7 days',
    last30Days: 'past 30 days'
  };

  const chartData = useMemo(() => {
    if (!games || games.length === 0) return [];
    
    const sortedGames = [...games].sort((a, b) => a.endTime - b.endTime);
    
    const dailyRatings: Record<string, { rapid?: number, blitz?: number, bullet?: number, daily?: number }> = {};
    
    sortedGames.forEach(game => {
      const dateStr = new Date(game.endTime * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      if (!dailyRatings[dateStr]) {
        dailyRatings[dateStr] = {};
      }
      
      if (['rapid', 'blitz', 'bullet', 'daily'].includes(game.timeClass)) {
        dailyRatings[dateStr][game.timeClass as keyof typeof dailyRatings[string]] = game.playerRating;
      }
    });
    
    const dates = Object.keys(dailyRatings);
    let lastRapid: number | undefined;
    let lastBlitz: number | undefined;
    let lastBullet: number | undefined;
    let lastDaily: number | undefined;
    
    return dates.map(date => {
      const r = dailyRatings[date];
      if (r.rapid !== undefined) lastRapid = r.rapid;
      if (r.blitz !== undefined) lastBlitz = r.blitz;
      if (r.bullet !== undefined) lastBullet = r.bullet;
      if (r.daily !== undefined) lastDaily = r.daily;
      
      return {
        date,
        rapid: lastRapid,
        blitz: lastBlitz,
        bullet: lastBullet,
        daily: lastDaily
      };
    });
  }, [games]);

  return (
    <div className="flex flex-col gap-32">
      {/* Pipeline Input Section */}
      {(!playerStats && !results) && (
        <section className={`flex flex-col items-center gap-16 transition-all duration-700 min-h-[60vh] justify-center`}>
          <div className="p-12 md:p-16 border border-black/10 bg-black/5 w-full max-w-3xl">
            <div className="flex flex-col items-center gap-12">
              <div className="flex flex-col items-center gap-6 w-full">
                <label className="text-sm uppercase tracking-widest text-black/40 font-bold text-center">Chess.com Username</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g., sakan1"
                  className="w-full max-w-xs bg-transparent border-b border-black/20 py-4 text-2xl font-sans text-black placeholder:text-black/20 focus:outline-none focus:border-indigo-600 transition-colors text-center"
                />
              </div>
              
              {error && <div className="text-red-600 text-base w-full text-center">{error}</div>}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-700 px-12 py-5 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
              >
                {isAnalyzing && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                <span className="text-base uppercase tracking-widest font-bold">
                  {isAnalyzing ? statusText || "Processing..." : "Analyze"}
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Results Section */}
      {(playerStats || results) && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-24"
        >
          <div className="flex justify-center mb-[-4rem] relative z-20">
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-6 h-12 rounded-full bg-black/5 hover:bg-black/10 text-black/60 hover:text-indigo-600 transition-colors text-xs uppercase tracking-widest font-bold"
            >
              New Analysis
            </button>
          </div>

          {/* Recent Form / Stats */}
          {playerStats && (
            <div className="flex flex-col items-center gap-16">
              <div className="flex flex-col items-center justify-center gap-8 border-b border-black/10 pb-8 group w-full">
                <div className="flex items-center justify-center gap-4">
                  <h2 className="text-2xl uppercase tracking-widest font-bold text-indigo-600 text-center"><ScrambleText text="Recent Form" /></h2>
                </div>
                
                {/* Timeframe Filter */}
                <div className="flex items-center justify-center gap-12 overflow-x-auto text-base w-full">
                  {(Object.keys(timeframeLabels) as AnalysisTimeframe[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`lowercase transition-colors whitespace-nowrap ${
                        timeframe === tf 
                          ? 'text-indigo-600 underline underline-offset-[6px] decoration-1' 
                          : 'text-black/50 hover:text-black'
                      }`}
                    >
                      {timeframeLabels[tf]}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-8 w-full">
                <div className="p-12 flex flex-col items-center gap-12 border border-black/20 bg-white">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <h3 className="text-base uppercase tracking-widest text-black/40 font-bold text-center">{timeframeLabels[timeframe]}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-16 w-full max-w-2xl">
                    <div className="flex flex-col items-center">
                      <span className="text-6xl font-mono text-emerald-500 text-center">{playerStats.timeframes[timeframe].wins}</span>
                      <span className="text-base uppercase tracking-widest text-black/40 mt-4 text-center">Wins</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-6xl font-mono text-black/60 text-center">{playerStats.timeframes[timeframe].losses}</span>
                      <span className="text-base uppercase tracking-widest text-black/40 mt-4 text-center">Losses</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-6xl font-mono text-black/40 text-center">{playerStats.timeframes[timeframe].draws}</span>
                      <span className="text-base uppercase tracking-widest text-black/40 mt-4 text-center">Draws</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ratings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                <div className="p-10 flex flex-col items-center gap-8 border border-black/20 bg-white">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center justify-center gap-4">
                      <h3 className="text-base uppercase tracking-widest text-black/40 font-bold text-center">Rapid Rating</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <span className="text-5xl font-mono text-black text-center">{playerStats.elo.rapid?.current || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-10 flex flex-col items-center gap-8 border border-black/20 bg-white">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center justify-center gap-4">
                      <h3 className="text-base uppercase tracking-widest text-black/40 font-bold text-center">Blitz Rating</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <span className="text-5xl font-mono text-black text-center">{playerStats.elo.blitz?.current || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-10 flex flex-col items-center gap-8 border border-black/20 bg-white">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center justify-center gap-4">
                      <h3 className="text-base uppercase tracking-widest text-black/40 font-bold text-center">Bullet Rating</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <span className="text-5xl font-mono text-black text-center">{playerStats.elo.bullet?.current || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-10 flex flex-col items-center gap-8 border border-black/20 bg-white">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center justify-center gap-4">
                      <h3 className="text-base uppercase tracking-widest text-black/40 font-bold text-center">Daily Rating</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <span className="text-5xl font-mono text-black text-center">{playerStats.elo.daily?.current || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Rating Chart */}
              {chartData.length > 0 && (
                <div className="w-full mt-16 p-12 border border-black/20 bg-white">
                  <div className="flex items-center justify-center mb-8">
                    <h3 className="text-base uppercase tracking-widest text-black/40 font-bold text-center">Rating History</h3>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0px' }}
                          itemStyle={{ fontSize: '14px' }}
                          labelStyle={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}
                        />
                        <Legend 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: '12px', cursor: 'pointer' }} 
                          onClick={handleLegendClick}
                        />
                        <Line hide={hiddenSeries['rapid']} type="monotone" dataKey="rapid" stroke={hiddenSeries['rapid'] ? '#9ca3af' : '#4f46e5'} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                        <Line hide={hiddenSeries['blitz']} type="monotone" dataKey="blitz" stroke={hiddenSeries['blitz'] ? '#9ca3af' : '#10b981'} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                        <Line hide={hiddenSeries['bullet']} type="monotone" dataKey="bullet" stroke={hiddenSeries['bullet'] ? '#9ca3af' : '#f59e0b'} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                        <Line hide={hiddenSeries['daily']} type="monotone" dataKey="daily" stroke={hiddenSeries['daily'] ? '#9ca3af' : '#ef4444'} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bullet 1+1 History Grid */}
          {games && games.filter(g => g.timeControl === '60+1').length > 0 && (
            <div className="flex flex-col items-center gap-16 mt-24 w-full">
              <div className="flex items-center justify-center gap-4 border-b border-black/10 pb-8 group w-full">
                <h2 className="text-2xl uppercase tracking-widest font-bold text-indigo-600 text-center"><ScrambleText text="Bullet 1+1 History" /></h2>
              </div>
              
              <div className="w-full max-w-[1096px] mx-auto overflow-hidden">
                <div 
                  className="grid grid-rows-1 grid-flow-col gap-6 transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${bulletSliderValue * (256 + 24)}px)` }}
                >
                  {games.filter(g => g.timeControl === '60+1').map((game, idx) => (
                    <div 
                      key={game.id || idx} 
                      onClick={() => setSelectedGameForChart(game)}
                      className="group flex flex-col border border-black/20 hover:border-indigo-600 transition-colors p-6 relative overflow-hidden w-64 h-96 shrink-0 cursor-pointer bg-white"
                    >
                      {/* Minimalist top bar */}
                      <div className="flex justify-between items-center mb-6">
                        <span className="font-mono text-xs text-black/40 uppercase tracking-widest">
                          {new Date(game.endTime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs uppercase tracking-widest ${
                            game.result === 'win' ? 'text-emerald-500' : 
                            game.result === 'loss' ? 'text-red-600' : 
                            'text-black/60'
                          }`}>
                            {game.result}
                          </span>
                        </div>
                      </div>

                      {/* Opponent Info */}
                      <div className="flex flex-col gap-2 mt-6">
                        <span className="font-mono text-xs text-black/40 uppercase tracking-widest">vs</span>
                        <span className="font-sans font-medium text-black/90 truncate text-xl">{game.opponentName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-black/30 uppercase">Actual Rating:</span>
                          <span className="font-mono text-sm text-black/50">{game.opponentRating}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-col gap-4 mt-auto">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-2 h-2 rounded-full ${game.playerColor === 'white' ? 'bg-black' : 'bg-black/20 border border-black/50'}`} />
                              <span className="font-mono text-[10px] text-black/30 uppercase tracking-widest">You</span>
                            </div>
                            <span className="font-mono text-base text-emerald-500">
                              {game.aiAccuracy ? `${game.aiAccuracy.toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-[10px] text-black/30 uppercase tracking-widest mb-2">CNN Performance (WIP)</span>
                            <span className="font-mono text-base text-black/90">
                              {game.aiEloGuess || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-[1px] bg-black/10 my-2" />

                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-2 h-2 rounded-full ${game.playerColor === 'white' ? 'bg-black/20 border border-black/50' : 'bg-black'}`} />
                              <span className="font-mono text-[10px] text-black/30 uppercase tracking-widest">Opp</span>
                            </div>
                            <span className="font-mono text-base text-red-600">
                              {game.aiOpponentAccuracy ? `${game.aiOpponentAccuracy.toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-[10px] text-black/30 uppercase tracking-widest mb-2">CNN Performance (WIP)</span>
                            <span className="font-mono text-base text-black/90">
                              {game.aiOpponentEloGuess || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slider and Expand Button */}
              {(() => {
                const bulletGames = games.filter(g => g.timeControl === '60+1');
                const totalColumns = bulletGames.length;
                const visibleColumns = 4;
                const maxSliderValue = Math.max(0, totalColumns - visibleColumns);
                
                return (
                  <div className="flex items-center justify-center gap-8 mt-4">
                    {maxSliderValue > 0 && (
                      <input 
                        type="range" 
                        min="0" 
                        max={maxSliderValue} 
                        value={bulletSliderValue}
                        onChange={(e) => setBulletSliderValue(parseInt(e.target.value))}
                        className="w-64 h-[1px] bg-black/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full"
                      />
                    )}
                    <button onClick={() => setIsBulletModalOpen(true)} className="text-black/50 hover:text-black transition-colors text-xs uppercase tracking-widest font-bold">
                      Expand
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {results && (
            <>
              {/* Top Flaws */}
              <div className="flex flex-col items-center gap-16 w-full mt-12">
                <div className="flex items-center justify-center gap-4 border-b border-black/10 pb-8 group w-full">
                  <h2 className="text-2xl uppercase tracking-widest font-bold text-indigo-600 text-center"><ScrambleText text="Top Flaws" /></h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full">
                  {results.topFlaws.map((flaw, idx) => (
                    <div key={idx} className="p-12 flex flex-col items-center text-center gap-8 border border-black/20 bg-white">
                      <div className="text-5xl font-sans font-bold text-black/10">0{idx + 1}</div>
                      <h3 className="text-xl font-bold text-indigo-600">{flaw.title}</h3>
                      <p className="text-base text-black/70 leading-loose">{flaw.description}</p>
                      <div className="mt-auto pt-6 border-t border-black/10 w-full">
                        <span className="text-sm uppercase tracking-widest text-black/40">Frequency: {flaw.frequency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prescriptive Feedback */}
              <div className="flex flex-col items-center gap-16 w-full mt-24">
                <div className="flex items-center justify-center gap-4 border-b border-black/10 pb-8 group w-full">
                  <h2 className="text-2xl uppercase tracking-widest font-bold text-indigo-600 text-center"><ScrambleText text="Prescriptive Feedback" /></h2>
                </div>
                
                <div className="p-16 border border-black/20 bg-white w-full">
                  <div className="flex flex-col items-center text-center gap-16">
                    <div className="flex flex-col items-center">
                      <h3 className="text-base uppercase tracking-widest text-black/40 font-bold mb-6">Training Plan</h3>
                      <p className="text-lg text-black/90 leading-loose max-w-3xl">{results.prescriptiveFeedback.plan}</p>
                    </div>
                    
                    <div className="flex flex-col items-center w-full">
                      <h3 className="text-base uppercase tracking-widest text-black/40 font-bold mb-6">Actionable Steps</h3>
                      <ul className="flex flex-col items-center gap-4 w-full max-w-2xl">
                        {results.prescriptiveFeedback.actionableSteps.map((step, idx) => (
                          <li key={idx} className="flex items-center justify-center gap-4 text-base text-black/70 text-center">
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Puzzles Link */}
              <div className="flex flex-col items-center gap-16 w-full mt-24">
                <div className="flex items-center justify-center gap-4 border-b border-black/10 pb-8 group w-full">
                  <h2 className="text-2xl uppercase tracking-widest font-bold text-indigo-600 text-center"><ScrambleText text="Custom Puzzles" /></h2>
                </div>
                
                <div className="p-16 flex flex-col items-center justify-center text-center gap-10 border border-black/20 bg-white">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-2xl font-bold text-black">Interactive Training</h3>
                    <p className="text-base text-black/70 max-w-md mx-auto leading-loose">
                      Based on your structural flaws, we've generated {results.customPuzzles.length} custom puzzles to help you improve.
                    </p>
                  </div>
                  <Link 
                    to="/puzzles"
                    className="flex items-center gap-3 bg-black hover:bg-black/80 text-white px-12 py-5 transition-all font-bold uppercase tracking-widest text-base"
                  >
                    Play Puzzles
                  </Link>
                </div>
              </div>
            </>
          )}

        </motion.section>
      )}

      {/* Bullet History Modal */}
      {isBulletModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/95 flex flex-col p-8 overflow-y-auto">
          <div className="flex flex-col items-center justify-center mb-8 max-w-[1400px] mx-auto w-full relative">
            <h2 className="text-xl uppercase tracking-widest font-bold text-black text-center">Bullet 1+1 History</h2>
            <button onClick={() => setIsBulletModalOpen(false)} className="absolute right-0 text-black/50 hover:text-black transition-colors text-xs uppercase tracking-widest font-bold">
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-w-[1400px] mx-auto w-full pb-12">
            {games.filter(g => g.timeControl === '60+1').map((game, idx) => (
              <a 
                key={game.id || idx} 
                href={game.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex flex-col border border-black/20 hover:border-indigo-600 transition-colors p-4 relative overflow-hidden h-72 bg-white"
              >
                {/* Minimalist top bar */}
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[10px] text-black/40 uppercase tracking-widest">
                    {new Date(game.endTime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`font-mono text-[10px] uppercase tracking-widest ${
                    game.result === 'win' ? 'text-emerald-500' : 
                    game.result === 'loss' ? 'text-red-600' : 
                    'text-black/60'
                  }`}>
                    {game.result}
                  </span>
                </div>

                {/* Opponent Info */}
                <div className="flex flex-col gap-1 mt-4">
                  <span className="font-mono text-[10px] text-black/40 uppercase tracking-widest">vs</span>
                  <span className="font-sans font-medium text-black/90 truncate text-lg">{game.opponentName}</span>
                  <span className="font-mono text-xs text-black/50">{game.opponentRating}</span>
                </div>

                {/* Stats */}
                <div className="flex flex-col gap-3 mt-auto">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${game.playerColor === 'white' ? 'bg-black' : 'bg-black/20 border border-black/50'}`} />
                        <span className="font-mono text-[9px] text-black/30 uppercase tracking-widest">You</span>
                      </div>
                      <span className="font-mono text-sm text-emerald-500">
                        {game.accuracy ? `${game.accuracy.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-[9px] text-black/30 uppercase tracking-widest mb-1">CNN Performance (WIP)</span>
                      <span className="font-mono text-sm text-black/90">
                        {game.aiEloGuess || 'Pending CNN'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-[1px] bg-black/10" />

                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${game.playerColor === 'white' ? 'bg-black/20 border border-black/50' : 'bg-black'}`} />
                        <span className="font-mono text-[9px] text-black/30 uppercase tracking-widest">Opp</span>
                      </div>
                      <span className="font-mono text-sm text-red-600">
                        {game.opponentAccuracy ? `${game.opponentAccuracy.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-[9px] text-black/30 uppercase tracking-widest mb-1">CNN Performance (WIP)</span>
                      <span className="font-mono text-sm text-black/90">
                        {game.aiOpponentEloGuess || 'Pending CNN'}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {/* Elo Confidence Modal */}
      {selectedGameForChart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-xl">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-white border border-black/10 p-8 relative"
          >
            <button 
              onClick={() => setSelectedGameForChart(null)}
              className="absolute top-4 right-4 text-black/40 hover:text-black transition-colors text-[10px] uppercase tracking-widest font-bold"
            >
              Close
            </button>

            <div className="flex flex-col items-center text-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-black/40 font-bold">Game Analysis Detail</span>
                <h3 className="text-2xl font-sans font-bold text-black">vs {selectedGameForChart.opponentName}</h3>
                <div className="flex items-center justify-center gap-4 text-xs font-mono text-black/40">
                  <span>{selectedGameForChart.timeControl}</span>
                  <span>•</span>
                  <span>{new Date(selectedGameForChart.endTime * 1000).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-12">
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-black/60 font-bold text-center">Your Performance Confidence (WIP)</span>
                    <span className="text-xs font-mono text-emerald-500 text-center">Accuracy: {selectedGameForChart.aiAccuracy?.toFixed(1)}%</span>
                  </div>
                  {selectedGameForChart.aiEloGuess && selectedGameForChart.aiEloLower && selectedGameForChart.aiEloUpper ? (
                    <EloConfidenceChart 
                      mean={selectedGameForChart.aiEloGuess}
                      lower={selectedGameForChart.aiEloLower}
                      upper={selectedGameForChart.aiEloUpper}
                      label="Your Estimated Elo"
                      color="#10b981"
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center border border-dashed border-black/10 text-black/20 text-xs uppercase tracking-widest">
                      CNN Analysis Pending
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-black/60 font-bold text-center">Opponent Performance Confidence (WIP)</span>
                    <span className="text-xs font-mono text-red-600 text-center">Accuracy: {selectedGameForChart.aiOpponentAccuracy?.toFixed(1)}%</span>
                  </div>
                  {selectedGameForChart.aiOpponentEloGuess && selectedGameForChart.aiOpponentEloLower && selectedGameForChart.aiOpponentEloUpper ? (
                    <EloConfidenceChart 
                      mean={selectedGameForChart.aiOpponentEloGuess}
                      lower={selectedGameForChart.aiOpponentEloLower}
                      upper={selectedGameForChart.aiOpponentEloUpper}
                      label="Opponent Estimated Elo"
                      color="#ef4444"
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center border border-dashed border-black/10 text-black/20 text-xs uppercase tracking-widest">
                      CNN Analysis Pending
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-center items-center gap-4 mt-4 pt-8 border-t border-black/5 w-full">
                <a 
                  href={selectedGameForChart.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors font-bold flex items-center justify-center gap-2"
                >
                  View Game on Chess.com
                </a>
                <span className="hidden md:block text-black/20">•</span>
                <button 
                  onClick={() => setSelectedGameForChart(null)}
                  className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors font-bold"
                >
                  Close Analysis
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
