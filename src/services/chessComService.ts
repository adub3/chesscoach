export interface PlayerStats {
  timeframes: {
    lastHour: { wins: number; losses: number; draws: number };
    last24Hours: { wins: number; losses: number; draws: number };
    last7Days: { wins: number; losses: number; draws: number };
    last30Days: { wins: number; losses: number; draws: number };
  };
  elo: {
    rapid: { current: number; change: number } | null;
    blitz: { current: number; change: number } | null;
    bullet: { current: number; change: number } | null;
    daily: { current: number; change: number } | null;
  };
  highestRatedWin: number | null;
  averageOpponentRating: number | null;
  averageAccuracy: number | null;
}

export interface GameRecord {
  id: string;
  url: string;
  pgn: string;
  timeControl: string;
  timeClass: string;
  endTime: number;
  playerColor: 'white' | 'black';
  playerRating: number;
  opponentName: string;
  opponentRating: number;
  result: string;
  accuracy?: number;
  opponentAccuracy?: number;
  aiEloGuess?: number;
  aiOpponentEloGuess?: number;
  aiEloLower?: number;
  aiEloUpper?: number;
  aiOpponentEloLower?: number;
  aiOpponentEloUpper?: number;
  aiAccuracy?: number;
  aiOpponentAccuracy?: number;
}

export interface ChessData {
  pgnsForAnalysis: string;
  stats: PlayerStats;
  games: GameRecord[];
}

export async function fetchChessComGames(username: string, maxGames: number = 50, timeframeFilter: string = 'last7Days'): Promise<ChessData> {
  try {
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
    if (!archivesRes.ok) {
      throw new Error(`Failed to fetch archives for ${username}. Please check the username.`);
    }
    
    const archivesData = await archivesRes.json();
    const archives = archivesData.archives as string[];

    if (!archives || archives.length === 0) {
      throw new Error(`No games found for ${username}`);
    }

    // Get last 2 months to ensure we cover the last 30 days
    const recentArchives = archives.slice(-2);
    let allGames: any[] = [];

    for (const archiveUrl of recentArchives) {
      const res = await fetch(archiveUrl);
      if (res.ok) {
        const data = await res.json();
        allGames = allGames.concat(data.games || []);
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    const oneDayAgo = now - 86400;
    const oneWeekAgo = now - 7 * 86400;
    const oneMonthAgo = now - 30 * 86400;
    
    const timeframeThresholds: Record<string, number> = {
      lastHour: oneHourAgo,
      last24Hours: oneDayAgo,
      last7Days: oneWeekAgo,
      last30Days: oneMonthAgo
    };
    const filterThreshold = timeframeThresholds[timeframeFilter] || oneWeekAgo;

    const stats: PlayerStats = {
      timeframes: {
        lastHour: { wins: 0, losses: 0, draws: 0 },
        last24Hours: { wins: 0, losses: 0, draws: 0 },
        last7Days: { wins: 0, losses: 0, draws: 0 },
        last30Days: { wins: 0, losses: 0, draws: 0 },
      },
      elo: { rapid: null, blitz: null, bullet: null, daily: null },
      highestRatedWin: null,
      averageOpponentRating: null,
      averageAccuracy: null,
    };

    const firstRatings: Record<string, number> = {};
    const lastRatings: Record<string, number> = {};
    
    let totalOpponentRating = 0;
    let opponentCount = 0;
    
    let totalAccuracy = 0;
    let accuracyCount = 0;

    let pgnsForAnalysis = '';
    let gamesCount = 0;
    const processedGames: GameRecord[] = [];

    // Sort games newest first
    allGames.sort((a, b) => b.end_time - a.end_time);

    const lowerUsername = username.toLowerCase();

    for (const game of allGames) {
      if (!game.end_time) continue;

      const isWhite = game.white.username.toLowerCase() === lowerUsername;
      const playerColor = isWhite ? 'white' : 'black';
      const opponentColor = isWhite ? 'black' : 'white';
      const player = game[playerColor];
      const opponent = game[opponentColor];

      // Opponent rating tracking
      if (opponent.rating) {
        totalOpponentRating += opponent.rating;
        opponentCount++;
      }

      // Accuracy tracking
      let playerAcc: number | undefined;
      let oppAcc: number | undefined;
      
      if (game.accuracies) {
        if (game.accuracies[playerColor]) {
          playerAcc = game.accuracies[playerColor];
          totalAccuracy += playerAcc;
          accuracyCount++;
        }
        if (game.accuracies[opponentColor]) {
          oppAcc = game.accuracies[opponentColor];
        }
      } else if (player.accuracy) {
        playerAcc = player.accuracy;
        totalAccuracy += playerAcc;
        accuracyCount++;
        oppAcc = opponent.accuracy;
      }

      // Determine result
      let resultType = 'draw';
      if (player.result === 'win') {
        resultType = 'win';
        if (opponent.rating && (!stats.highestRatedWin || opponent.rating > stats.highestRatedWin)) {
          stats.highestRatedWin = opponent.rating;
        }
      }
      else if (['checkmated', 'timeout', 'resigned', 'lose', 'abandoned'].includes(player.result)) resultType = 'loss';

      // Time filters
      if (game.end_time >= oneMonthAgo) {
        if (resultType === 'win') stats.timeframes.last30Days.wins++;
        else if (resultType === 'loss') stats.timeframes.last30Days.losses++;
        else stats.timeframes.last30Days.draws++;

        if (game.end_time >= oneWeekAgo) {
          if (resultType === 'win') stats.timeframes.last7Days.wins++;
          else if (resultType === 'loss') stats.timeframes.last7Days.losses++;
          else stats.timeframes.last7Days.draws++;

          if (game.end_time >= oneDayAgo) {
            if (resultType === 'win') stats.timeframes.last24Hours.wins++;
            else if (resultType === 'loss') stats.timeframes.last24Hours.losses++;
            else stats.timeframes.last24Hours.draws++;

            if (game.end_time >= oneHourAgo) {
              if (resultType === 'win') stats.timeframes.lastHour.wins++;
              else if (resultType === 'loss') stats.timeframes.lastHour.losses++;
              else stats.timeframes.lastHour.draws++;
            }
          }
        }

        // Track ELO for all fetched games to ensure we have a current rating
        const timeClass = game.time_class; // rapid, blitz, bullet, daily
        if (['rapid', 'blitz', 'bullet', 'daily'].includes(timeClass)) {
          if (!lastRatings[timeClass]) {
            lastRatings[timeClass] = player.rating; // Newest game rating
          }
          firstRatings[timeClass] = player.rating; // Will end up being the oldest game rating in the fetched window
        }
      }

      // Collect PGNs for analysis (prioritize losses/draws for finding errors, but take up to maxGames)
      if (game.pgn && gamesCount < maxGames && game.end_time >= filterThreshold) {
        // We feed the engine the most recent games from the selected timeframe
        pgnsForAnalysis += game.pgn + '\n\n';
        gamesCount++;
      }
      
      // Add to processed games
      processedGames.push({
        id: game.url,
        url: game.url,
        pgn: game.pgn || '',
        timeControl: game.time_control,
        timeClass: game.time_class,
        endTime: game.end_time,
        playerColor,
        playerRating: player.rating,
        opponentName: opponent.username,
        opponentRating: opponent.rating,
        result: resultType,
        accuracy: playerAcc,
        opponentAccuracy: oppAcc
      });
    }

    // Calculate ELO changes
    for (const tc of ['rapid', 'blitz', 'bullet', 'daily'] as const) {
      if (lastRatings[tc] && firstRatings[tc]) {
        stats.elo[tc] = {
          current: lastRatings[tc],
          change: lastRatings[tc] - firstRatings[tc]
        };
      }
    }

    if (opponentCount > 0) {
      stats.averageOpponentRating = Math.round(totalOpponentRating / opponentCount);
    }
    if (accuracyCount > 0) {
      stats.averageAccuracy = Number((totalAccuracy / accuracyCount).toFixed(1));
    }

    if (gamesCount === 0) {
      throw new Error(`No PGN data found in the recent games for ${username}`);
    }

    return { pgnsForAnalysis, stats, games: processedGames };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch games from Chess.com");
  }
}
