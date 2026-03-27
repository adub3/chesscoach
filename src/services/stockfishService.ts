/**
 * Service to interact with Stockfish engine via API
 */

export interface StockfishResponse {
  bestMove: string | null;
  evaluation: number | null;
  mate: number | null;
}

export class StockfishEngine {
  private apiUrl = 'https://stockfish.online/api/s/v2.php';

  public async getAnalysis(fen: string, depth: number = 10): Promise<StockfishResponse> {
    try {
      const response = await fetch(`${this.apiUrl}?fen=${encodeURIComponent(fen)}&depth=${depth}`);
      if (!response.ok) {
        throw new Error('Stockfish API error');
      }
      const data = await response.json();
      if (data.success) {
        // bestmove is in format "bestmove e2e4 ponder c7c5"
        const parts = (data.bestmove || '').split(' ');
        const move = parts[1] === '(none)' ? null : parts[1];
        return {
          bestMove: move || null,
          evaluation: data.evaluation,
          mate: data.mate
        };
      }
      return { bestMove: null, evaluation: null, mate: null };
    } catch (e) {
      console.error('Stockfish API failed:', e);
      return { bestMove: null, evaluation: null, mate: null };
    }
  }

  public async getBestMove(fen: string, depth: number = 10): Promise<string | null> {
    const analysis = await this.getAnalysis(fen, depth);
    return analysis.bestMove;
  }
}

export const stockfish = new StockfishEngine();
