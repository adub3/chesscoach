import { Chess } from 'chess.js';
import { analyzeGameWithCNN, GameAnalysis } from './eloModelService';
import { GoogleGenAI, Type } from "@google/genai";
import { stockfish } from './stockfishService';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ChessAnalysisResult {
  topFlaws: {
    title: string;
    description: string;
    frequency: string;
  }[];
  prescriptiveFeedback: {
    plan: string;
    actionableSteps: string[];
  };
  customPuzzles: {
    fen: string;
    explanation: string;
    category: string;
    solutionMoves: string[];
  }[];
}

export interface AiCoachResponse {
  explanation: string;
  visuals?: {
    arrows?: { start: string; end: string; color: string }[];
    highlights?: { square: string; color: string }[];
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function fetchEval(fen: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

  // Try Lichess first as it has better CORS support and reliability
  try {
    const lichessRes = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (lichessRes.ok) {
      const data = await lichessRes.json();
      if (data.pvs && data.pvs.length > 0) {
        const pv = data.pvs[0];
        if (pv.moves) {
          const moves = pv.moves.split(' ');
          return {
            move: moves[0],
            eval: pv.cp !== undefined ? pv.cp / 100 : undefined,
            mate: pv.mate !== undefined ? pv.mate : undefined,
            continuationArr: moves.slice(1)
          };
        }
      }
    }
  } catch (e) {
    // Silently fail Lichess and try fallback
  }

  // Fallback to chess-api.com
  try {
    const fallbackController = new AbortController();
    const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 3000);
    
    await delay(50); // reduced delay
    const res = await fetch('https://chess-api.com/v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen }),
      signal: fallbackController.signal
    });
    clearTimeout(fallbackTimeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      move: data.move || data.san || (data.from && data.to ? data.from + data.to + (data.promotion || '') : undefined),
      eval: data.eval,
      mate: data.mate,
      continuationArr: data.continuationArr || []
    };
  } catch (e) {
    return null;
  }
}

export async function analyzeChessGames(pgnData: string, username: string): Promise<ChessAnalysisResult> {
  const games = pgnData.split('\n\n[Event ').map((g, i) => i === 0 ? g : '[Event ' + g).filter(g => g.trim().length > 0);
  
  const customPuzzles: ChessAnalysisResult['customPuzzles'] = [];
  let tacticalErrors = 0;
  let positionalErrors = 0;
  let endgameErrors = 0;
  let openingErrors = 0;

  // Limit to 3 games for faster processing
  const gamesToAnalyze = games.filter(pgn => {
    const chess = new Chess();
    try { chess.loadPgn(pgn); } catch (e) { return false; }
    const whitePlayer = chess.header().White;
    const blackPlayer = chess.header().Black;
    const result = chess.header().Result;
    if (!whitePlayer || !blackPlayer) return false;
    
    const isWhite = whitePlayer.toLowerCase() === username.toLowerCase();
    const isBlack = blackPlayer.toLowerCase() === username.toLowerCase();
    if (!isWhite && !isBlack) return false;
    
    const playerWon = (isWhite && result === '1-0') || (isBlack && result === '0-1');
    return !playerWon;
  }).slice(0, 3);
  
  if (gamesToAnalyze.length < 3) {
    const wins = games.filter(pgn => !gamesToAnalyze.includes(pgn)).slice(0, 3 - gamesToAnalyze.length);
    gamesToAnalyze.push(...wins);
  }

  for (const pgn of gamesToAnalyze) {
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
    } catch (e) {
      continue;
    }

    const whitePlayer = chess.header().White;
    const blackPlayer = chess.header().Black;
    if (!whitePlayer || !blackPlayer) continue;
    
    const isWhite = whitePlayer.toLowerCase() === username.toLowerCase();
    const history = chess.history({ verbose: true });
    
    // Get the starting FEN of the loaded game (handles Chess960 or custom starting positions)
    const initialFen = chess.header().FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const tempChess = new Chess(initialFen);
    
    // Analyze moves 10 to 50 (key middle game)
    const startMove = 10;
    const endMove = Math.min(history.length, 50);

    for (let i = 0; i < endMove; i++) {
      const move = history[i];
      const isPlayerTurn = isWhite ? (i % 2 === 0) : (i % 2 === 1);
      
      if (isPlayerTurn && i >= startMove) {
        const fenBefore = tempChess.fen();
        const evalDataBefore = await fetchEval(fenBefore);
        
        if (evalDataBefore && evalDataBefore.move) {
          let evalBefore = evalDataBefore.eval;
          if (evalBefore === null || evalBefore === undefined) {
            evalBefore = evalDataBefore.mate ? (evalDataBefore.mate > 0 ? 100 : -100) : 0;
          }
          
          const playerEvalBefore = isWhite ? evalBefore : -evalBefore;
          const playerMove = history[i];
          const playerMoveLan = playerMove.from + playerMove.to + (playerMove.promotion || '');
          
          if (playerMoveLan !== evalDataBefore.move) {
            tempChess.move(playerMove.san);
            const fenAfter = tempChess.fen();
            const evalDataAfter = await fetchEval(fenAfter);
            tempChess.undo();
            
            if (evalDataAfter) {
              let evalAfter = evalDataAfter.eval;
              if (evalAfter === null || evalAfter === undefined) {
                evalAfter = evalDataAfter.mate ? (evalDataAfter.mate > 0 ? 100 : -100) : 0;
              }
              
              const playerEvalAfter = isWhite ? evalAfter : -evalAfter;
              const evalDrop = playerEvalBefore - playerEvalAfter;
              
              if (evalDrop > 2.0 && playerEvalBefore > -3.0) {
                let category = 'Tactical Blunder';
                if (i < 20) { openingErrors++; category = 'Opening Inaccuracy'; }
                else if (i > 40) { endgameErrors++; category = 'Endgame Blunder'; }
                else { tacticalErrors++; }
                
                const continuation = [evalDataBefore.move, ...(evalDataBefore.continuationArr || [])];
                const maxMoves = continuation.length >= 3 ? 3 : 1;
                
                if (customPuzzles.length < 5 && !customPuzzles.find(p => p.fen === fenBefore)) {
                  // Convert LAN moves to SAN for the puzzle
                  const puzzleChess = new Chess(fenBefore);
                  const solutionMoves: string[] = [];
                  for (const lanMove of continuation.slice(0, maxMoves)) {
                    try {
                      let m;
                      try {
                        // Try as SAN first
                        m = puzzleChess.move(lanMove);
                      } catch (e) {
                        // Fallback to LAN
                        const from = lanMove.substring(0, 2);
                        const to = lanMove.substring(2, 4);
                        const promotion = lanMove.length > 4 ? lanMove.substring(4) : undefined;
                        m = puzzleChess.move({ from, to, promotion });
                      }
                      if (m) solutionMoves.push(m.san);
                    } catch (e) { break; }
                  }

                  if (solutionMoves.length > 0) {
                    customPuzzles.push({
                      fen: fenBefore,
                      explanation: `You played ${playerMove.san}, but the engine prefers ${solutionMoves[0]}. This dropped your evaluation by ${evalDrop.toFixed(1)} points.`,
                      category,
                      solutionMoves
                    });
                  }
                }
              }
            }
          }
        }
      }
      tempChess.move(move.san);
      if (customPuzzles.length >= 5) break;
    }
    if (customPuzzles.length >= 5) break;
  }

  // Fallback puzzles if API failed or no blunders found
  if (customPuzzles.length === 0) {
    customPuzzles.push({
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      explanation: 'This is a classic opening trap. White can win material here.',
      category: 'Opening Trap',
      solutionMoves: ['Nxe5', 'Nxe5', 'd4']
    });
    customPuzzles.push({
      fen: 'r1bq1rk1/ppp2ppp/2n2n2/3pp3/1b2P3/2NP1N2/PPPBBPPP/R2Q1RK1 w - - 4 8',
      explanation: 'A common tactical motif in the center.',
      category: 'Center Tactics',
      solutionMoves: ['exd5', 'Nxd5', 'Nxd5']
    });
  }

  // Generate Top Flaws based on error counts
  let topFlaws = [];
  if (tacticalErrors >= openingErrors && tacticalErrors >= endgameErrors) {
    topFlaws.push({
      title: "Tactical Oversights",
      description: "Missing tactical opportunities or falling for basic tactics in the middlegame.",
      frequency: "High"
    });
  }
  if (openingErrors > 0) {
    topFlaws.push({
      title: "Opening Inaccuracies",
      description: "Making sub-optimal moves in the opening phase, leading to worse positions.",
      frequency: openingErrors > 2 ? "High" : "Medium"
    });
  }
  if (endgameErrors > 0) {
    topFlaws.push({
      title: "Endgame Mistakes",
      description: "Struggling to convert winning endgames or defending drawn ones.",
      frequency: "Medium"
    });
  }
  
  if (topFlaws.length === 0) {
    topFlaws.push({
      title: "Positional Weaknesses",
      description: "Creating weaknesses in the pawn structure or piece placement.",
      frequency: "Medium"
    });
  }
  
  // Ensure exactly 2 or 4 flaws for symmetry
  if (topFlaws.length === 1) {
    topFlaws.push({
      title: "Time Management",
      description: "Rushing critical decisions or spending too much time on obvious moves.",
      frequency: "Low"
    });
  } else if (topFlaws.length === 3) {
    topFlaws.push({
      title: "Calculation Errors",
      description: "Miscalculating forcing lines and variations.",
      frequency: "Medium"
    });
  } else if (topFlaws.length > 4) {
    topFlaws = topFlaws.slice(0, 4);
  }

  const prescriptiveFeedback = {
    plan: "Focus on tactical awareness and consistent opening principles. Your analysis shows a tendency to drop evaluation in complex middlegame positions.",
    actionableSteps: [
      "Solve 10-15 tactical puzzles daily to improve pattern recognition.",
      "Review your opening repertoire and ensure you understand the middle game plans.",
      "Always check for undefended pieces and potential forks before committing to a move.",
      "Analyze your games with an engine to understand the 'why' behind your mistakes."
    ]
  };

  return {
    topFlaws,
    prescriptiveFeedback,
    customPuzzles
  };
}

export async function getCounterfactualExplanation(
  fen: string, 
  bestMove: string, 
  explanation: string,
  solutionMoves: string[]
): Promise<AiCoachResponse> {
  try {
    const prompt = `
      You are a world-class chess coach and grandmaster. 
      I am looking at a crucial chess position (FEN: ${fen}).
      The best move in this position is ${bestMove}.
      The full solution sequence is: ${solutionMoves.join(', ')}.
      
      Current basic explanation: ${explanation}
      
      Please explain WHY this specific sequence of moves (the solution) is good and why it works.
      Do NOT invent counterfactuals or explain other moves unless necessary to explain the main idea. Focus on the engine's chosen path.
      
      Provide your response in JSON format.
      1. Explain the strategic or tactical ideas behind the solution moves.
      2. Provide visual cues (arrows and highlights) to help illustrate your point.
         - Arrows: { start: string (e.g. "e2"), end: string (e.g. "e4"), color: string (hex or rgba) }
         - Highlights: { square: string (e.g. "g7"), color: string (hex or rgba) }
      3. Use a professional, encouraging, and highly technical yet accessible tone.
      4. Keep the text explanation concise (max 150 words).
      5. IMPORTANT: You must directly reference the engine's best move in your explanation.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            visuals: {
              type: Type.OBJECT,
              properties: {
                arrows: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      start: { type: Type.STRING },
                      end: { type: Type.STRING },
                      color: { type: Type.STRING }
                    },
                    required: ["start", "end", "color"]
                  }
                },
                highlights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      square: { type: Type.STRING },
                      color: { type: Type.STRING }
                    },
                    required: ["square", "color"]
                  }
                }
              }
            }
          },
          required: ["explanation"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as AiCoachResponse;
  } catch (error) {
    console.error("Error generating AI explanation:", error);
    return { explanation: "The AI coach is currently unavailable. Please try again later." };
  }
}

export async function chatWithAiCoach(
  fen: string,
  history: ChatMessage[],
  userMessage: string
): Promise<AiCoachResponse> {
  try {
    const evaluateMoveDeclaration = {
      name: "evaluateMove",
      description: "Evaluates a specific chess move from the current position using the Stockfish engine. Returns the evaluation score and the engine's best continuation.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          move: {
            type: Type.STRING,
            description: "The move to evaluate in SAN (e.g., 'Nf3', 'exd5') or LAN (e.g., 'e2e4')."
          }
        },
        required: ["move"]
      }
    };

    const systemInstruction = `
      You are a world-class chess coach and grandmaster. You are discussing a specific chess position (FEN: ${fen}).
      Answer the user's questions about this position.
      IMPORTANT: When asked why a move is bad or about an alternative move, you MUST use the 'evaluateMove' tool to input it into Stockfish and get the evaluation. Do NOT create your own argument without consulting the engine first. Explain the position based on the engine's evaluation and best continuation.
      
      Your final response to the user MUST be a valid JSON object (without markdown formatting) with an "explanation" field and optional "visuals" (arrows and highlights).
      Visuals schema:
      - arrows: Array<{ start: string, end: string, color: string }>
      - highlights: Array<{ square: string, color: string }>
      Be concise, technical, and helpful.
    `;

    const contents: any[] = [
      ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    let response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [evaluateMoveDeclaration] }]
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === 'evaluateMove') {
        const moveArgs = call.args as any;
        const move = moveArgs.move;
        let toolResult: any = {};
        try {
          const chess = new Chess(fen);
          chess.move(move);
          const newFen = chess.fen();
          const analysis = await stockfish.getAnalysis(newFen, 12);
          toolResult = {
            success: true,
            evaluation: analysis.evaluation,
            mate: analysis.mate,
            bestEngineResponse: analysis.bestMove,
            fenAfterMove: newFen
          };
        } catch (e: any) {
          toolResult = { success: false, error: e.message || "Invalid move or engine error." };
        }

        contents.push(response.candidates![0].content);
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: call.name,
              response: toolResult
            }
          }]
        });

        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: [evaluateMoveDeclaration] }]
          }
        });
      }
    }

    let text = response.text || '{}';
    text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(text) as AiCoachResponse;
  } catch (error) {
    console.error("Error in AI chat:", error);
    return { explanation: "I'm having trouble connecting right now. Could you repeat that?" };
  }
}

// GameAnalysis interface is now imported from eloModelService.ts

export async function batchAnalyzeGames(games: { url: string; pgn: string }[]): Promise<GameAnalysis[]> {
  if (games.length === 0) return [];

  const allResults: GameAnalysis[] = [];

  for (const game of games) {
    try {
      const cnnResult = await analyzeGameWithCNN(game.pgn);
      
      // Confidence interval based on CNN estimate variance (simulated)
      const variance = 150;
      
      allResults.push({
        gameUrl: game.url,
        whiteEloMean: cnnResult.whiteElo,
        whiteEloLower: cnnResult.whiteElo - variance,
        whiteEloUpper: cnnResult.whiteElo + variance,
        blackEloMean: cnnResult.blackElo,
        blackEloLower: cnnResult.blackElo - variance,
        blackEloUpper: cnnResult.blackElo + variance,
        whiteAccuracy: cnnResult.whiteAccuracy,
        blackAccuracy: cnnResult.blackAccuracy
      });
    } catch (e) {
      console.error(`Error analyzing game ${game.url} with CNN:`, e);
    }
  }

  return allResults;
}
