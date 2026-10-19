// Every achievement a player can earn. The frontend keeps the same ids, labels and descriptions
// in front/src/game/achievements.js for display.
const LIST = [
    // Winning rounds
    ['first_win', 'First win', 'Win your first round'],
    ['ten_wins', 'Veteran', 'Win 10 rounds'],
    ['fifty_wins', 'Champion', 'Win 50 rounds'],
    ['hundred_wins', 'Centurion', 'Win 100 rounds'],
    ['streak_5', 'Hot streak', 'Win 5 rounds in a row'],
    ['streak_10', 'Unstoppable', 'Win 10 rounds in a row'],
    // How you win
    ['speedrun', 'Speedrun', 'Win a round in 15 moves or fewer'],
    ['buzzer', 'Buzzer beater', 'Win with under 5 seconds left on your clock'],
    ['skyscraper', 'Skyscraper', 'Win with four discs stacked in one column'],
    ['diagonal', 'Sharp angle', 'Win with a diagonal line'],
    ['giant_slayer', 'Giant slayer', 'Beat a player 5 or more levels above you'],
    ['comeback', 'Comeback', 'Win a round while 2 points behind in the match'],
    ['shutout', 'Shutout', 'Lead a match 3–0'],
    // Playing
    ['stalemate', 'Stalemate', 'Fill the whole board without a winner'],
    ['marathon', 'Marathon', 'Play 100 online rounds'],
    ['tournament_champion', 'Tournament champion', 'Win a four-player tournament'],
    ['social', 'Squad', 'Add 5 friends'],
    // Puzzles and levels
    ['puzzler', 'Puzzler', 'Solve a daily puzzle'],
    ['puzzle_master', 'Puzzle master', 'Solve 7 daily puzzles'],
    ['level_5', 'Rising star', 'Reach level 5'],
    ['level_10', 'Legend', 'Reach level 10'],
]

const ACHIEVEMENTS = Object.fromEntries(LIST.map(([id, label, desc]) => [id, { id, label, desc }]))

exports.ACHIEVEMENTS = ACHIEVEMENTS

/**
 * Achievements earned by winning a round.
 * winner/loser: User documents after stats were updated.
 * ctx: { game, winnerSeat, line, elapsedMs, reason }
 */
exports.roundWinAchievements = (winner, loser, { game, winnerSeat, line, elapsedMs, reason }) => {
    const ids = []
    const wins = winner.stats?.wins || 0
    const streak = winner.stats?.streak || 0
    if (wins >= 1) ids.push('first_win')
    if (wins >= 10) ids.push('ten_wins')
    if (wins >= 50) ids.push('fifty_wins')
    if (wins >= 100) ids.push('hundred_wins')
    if (streak >= 5) ids.push('streak_5')
    if (streak >= 10) ids.push('streak_10')
    if (loser.lvl >= winner.lvl + 5) ids.push('giant_slayer')

    const mine = game.score[winnerSeat]
    const theirs = game.score[winnerSeat === 'p1' ? 'p2' : 'p1']
    if (mine >= 3 && theirs === 0) ids.push('shutout')
    // Scores already include this round, so before it we had mine - 1.
    if (theirs - (mine - 1) >= 2) ids.push('comeback')

    if (reason === 'connect') {
        if (game.p1_Moves.length + game.p2_Moves.length <= 15) ids.push('speedrun')
        if (typeof elapsedMs === 'number' && elapsedMs >= 25000) ids.push('buzzer')
        if (line) {
            const cols = new Set(line.map((p) => p[1]))
            const rows = new Set(line.map((p) => p[0]))
            if (cols.size === 1) ids.push('skyscraper')
            if (cols.size === 4 && rows.size === 4) ids.push('diagonal')
        }
    }
    return ids
}

/** Achievements any player can earn from their running totals (after any round). */
exports.totalsAchievements = (user) => {
    const s = user.stats || {}
    const played = (s.wins || 0) + (s.losses || 0) + (s.draws || 0)
    return played >= 100 ? ['marathon'] : []
}

exports.levelAchievements = (lvl) => [lvl >= 5 && 'level_5', lvl >= 10 && 'level_10'].filter(Boolean)
