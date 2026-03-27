import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ScrambleText } from '../components/ScrambleText';
import { PlayablePuzzle } from '../components/PlayablePuzzle';
import { ChessAnalysisResult, getCounterfactualExplanation, chatWithAiCoach, ChatMessage, AiCoachResponse } from '../services/geminiService';
import { Loader2, Sparkles, Send, User, Bot } from 'lucide-react';

interface PuzzlesPageProps {
  results: ChessAnalysisResult | null;
}

export function PuzzlesPage({ results }: PuzzlesPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [aiResponse, setAiResponse] = useState<AiCoachResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');

  const categories = useMemo(() => {
    if (!results?.customPuzzles) return ['All'];
    const cats = new Set(results.customPuzzles.map(p => p.category || 'Uncategorized'));
    return ['All', ...Array.from(cats)];
  }, [results]);

  const filteredPuzzles = useMemo(() => {
    if (!results?.customPuzzles) return [];
    if (selectedCategory === 'All') return results.customPuzzles;
    return results.customPuzzles.filter(p => (p.category || 'Uncategorized') === selectedCategory);
  }, [results, selectedCategory]);

  // Reset index when category changes
  React.useEffect(() => {
    setCurrentPuzzleIndex(0);
    setAiResponse(null);
    setChatHistory([]);
  }, [selectedCategory]);

  if (!results || !results.customPuzzles || results.customPuzzles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-8">
        <p className="text-black/60 font-mono">No puzzles available. Please run the analysis first.</p>
        <Link to="/diagnostics" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-500 transition-colors">
          <span className="text-sm uppercase tracking-widest font-bold">Back to Analysis</span>
        </Link>
      </div>
    );
  }

  const safeIndex = Math.max(0, Math.min(currentPuzzleIndex, filteredPuzzles.length - 1));
  const currentPuzzle = filteredPuzzles[safeIndex];

  const handleNext = () => {
    if (safeIndex < filteredPuzzles.length - 1) {
      setCurrentPuzzleIndex(safeIndex + 1);
      setAiResponse(null);
      setChatHistory([]);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentPuzzleIndex(safeIndex - 1);
      setAiResponse(null);
      setChatHistory([]);
    }
  };

  const handleAskAi = async () => {
    if (!currentPuzzle) return;
    setIsAiLoading(true);
    try {
      const response = await getCounterfactualExplanation(
        currentPuzzle.fen,
        currentPuzzle.solutionMoves[0],
        currentPuzzle.explanation,
        currentPuzzle.solutionMoves
      );
      setAiResponse(response);
      setChatHistory([{ role: 'model', text: response.explanation }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isAiLoading || !currentPuzzle) return;

    const userMsg = userInput.trim();
    setUserInput('');
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: userMsg }];
    setChatHistory(newHistory);
    setIsAiLoading(true);

    try {
      const response = await chatWithAiCoach(currentPuzzle.fen, newHistory, userMsg);
      setAiResponse(response);
      setChatHistory(prev => [...prev, { role: 'model', text: response.explanation }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-8 w-full min-h-[80vh]"
    >
      <div className="flex flex-col items-center justify-center gap-12 border-b border-black/10 pb-12 w-full text-center">
        <div className="flex flex-col items-center gap-8 group w-full">
          <Link to="/diagnostics" className="flex items-center justify-center px-6 h-12 rounded-full bg-black/5 hover:bg-black/10 text-black/40 hover:text-indigo-600 transition-colors text-xs uppercase tracking-widest font-bold mb-4">
            Back
          </Link>
          <div className="flex flex-col items-center">
            <h2 className="text-4xl uppercase tracking-widest font-bold text-black text-center"><ScrambleText text="Crucial Positions" /></h2>
            <p className="text-base text-black/40 font-mono mt-4 text-center">Extracted from your recent games</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center justify-center gap-4 bg-white border border-black/20 p-2 overflow-x-auto max-w-full w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-3 text-sm uppercase tracking-widest font-bold transition-colors whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-black text-white' 
                  : 'text-black/40 hover:text-black hover:bg-black/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      {filteredPuzzles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border border-black/20 bg-white p-8">
          <p className="text-black/40 font-mono">No puzzles found for this category.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-16 flex-1 max-w-4xl mx-auto w-full">
          {/* Main Puzzle Area */}
          <div className="w-full flex flex-col gap-12">
            <div className="p-8 md:p-16 flex-1 flex flex-col items-center justify-center bg-white border border-black/20">
              <div className="w-full max-w-[600px] aspect-square">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedCategory}-${safeIndex}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                  >
                    <PlayablePuzzle 
                      key={currentPuzzle.fen} 
                      fen={currentPuzzle.fen} 
                      solutionMoves={currentPuzzle.solutionMoves} 
                      customArrows={aiResponse?.visuals?.arrows}
                      customHighlights={aiResponse?.visuals?.highlights}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between border border-black/20 bg-white p-4">
              <button 
                onClick={handlePrev}
                disabled={safeIndex === 0}
                className="flex items-center gap-2 px-8 py-4 hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-black font-bold uppercase tracking-widest text-sm"
              >
                Prev
              </button>
              <div className="text-black/40 font-mono text-base">
                {safeIndex + 1} / {filteredPuzzles.length}
              </div>
              <button 
                onClick={handleNext}
                disabled={safeIndex === filteredPuzzles.length - 1}
                className="flex items-center gap-2 px-8 py-4 hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-black font-bold uppercase tracking-widest text-sm"
              >
                Next
              </button>
            </div>
          </div>

          {/* Puzzle Details Sidebar (now Underneath) */}
          <div className="w-full flex flex-col gap-12">
            <div className="p-12 md:p-16 flex flex-col items-center text-center gap-12 h-full border border-black/20 bg-white">
              <div className="flex items-center justify-center gap-3 border-b border-black/10 pb-8 w-full">
                <h3 className="text-base uppercase tracking-widest text-black/40 font-bold text-center">
                  {currentPuzzle.category || 'Crucial Position'}
                </h3>
              </div>
              
              <div className="flex-1 flex flex-col gap-8 overflow-hidden w-full">
                <AnimatePresence mode="wait">
                  {chatHistory.length > 0 ? (
                    <motion.div
                      key="chat-container"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col gap-6 h-full w-full"
                    >
                      <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">AI Coach Session</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-black/10 max-h-[400px]">
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-black'}`}>
                              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                            </div>
                            <div className={`p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-50 text-indigo-900 text-right' : 'bg-black/5 text-black/90 text-left'}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isAiLoading && (
                          <div className="flex gap-4">
                            <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-black">
                              <Loader2 className="w-4 h-4 text-white animate-spin" />
                            </div>
                            <div className="p-4 bg-black/5 text-black/40 text-sm italic">
                              Thinking...
                            </div>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleSendMessage} className="mt-auto flex gap-2 pt-4 border-t border-black/10">
                        <input
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder="Ask a follow-up question..."
                          className="flex-1 bg-black/5 border-none px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-600 outline-none"
                        />
                        <button 
                          type="submit"
                          disabled={isAiLoading || !userInput.trim()}
                          className="bg-black text-white p-3 hover:bg-indigo-600 transition-colors disabled:opacity-30"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>

                      <button 
                        onClick={() => { setAiResponse(null); setChatHistory([]); }}
                        className="text-[10px] uppercase tracking-widest font-bold text-black/40 hover:text-black transition-colors"
                      >
                        Reset Coach
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="basic-explanation"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center h-full gap-8 w-full"
                    >
                      <p className="text-lg md:text-xl text-black/90 leading-loose text-center">
                        {currentPuzzle.explanation}
                      </p>
                      
                      <button
                        onClick={handleAskAi}
                        disabled={isAiLoading}
                        className="w-full flex items-center justify-center gap-3 bg-black text-white hover:bg-black/90 px-8 py-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[10px] uppercase tracking-widest font-bold"
                      >
                        {isAiLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {isAiLoading ? "Consulting Engine & Grandmaster..." : "Ask AI Coach & Engine for Deep Analysis"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-auto pt-12 border-t border-black/10 w-full flex flex-col items-center">
                <span className="text-sm uppercase tracking-widest text-black/40 block mb-8 text-center">Solution Sequence</span>
                <div className="flex flex-wrap justify-center gap-4">
                  {currentPuzzle.solutionMoves.map((move, mIdx) => (
                    <code key={mIdx} className="text-black border border-black/20 bg-black/5 px-4 py-3 text-base font-mono">
                      {mIdx % 2 === 0 ? `${Math.floor(mIdx/2) + 1}. ` : ''}{move}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.section>

  );
}
