const ACHIEVEMENTS = {
    first_win:    { id: 'first_win',    label: 'First Blood',   desc: 'Win your first game',                icon: '🏆' },
    ten_wins:     { id: 'ten_wins',     label: 'Veteran',       desc: 'Win 10 games',                       icon: '⚔️'  },
    fifty_wins:   { id: 'fifty_wins',   label: 'Champion',      desc: 'Win 50 games',                       icon: '👑'  },
    giant_slayer: { id: 'giant_slayer', label: 'Giant Slayer',  desc: 'Beat a player 5+ levels above you',  icon: '🐉' },
    shutout:      { id: 'shutout',      label: 'Shutout',       desc: 'Win a session without opponent scoring', icon: '🛡️' },
    speedrun:     { id: 'speedrun',     label: 'Speedrun',      desc: 'Win a round in 15 moves or less',    icon: '⚡' },
};

exports.ACHIEVEMENTS = ACHIEVEMENTS;

/**
 * Check which new achievements the winner unlocked.
 * winner  — updated User document (stats.wins already incremented)
 * loser   — updated User document
 * game    — Game document (score and moves for current round)
 * isP1Win — boolean, whether p1 is the winner (to determine shutout score side)
 */
exports.checkAchievements = (winner, loser, game, isP1Win) => {
    const newAchievements = [];
    const already = (id) => winner.achievements.includes(id);

    if (!already('first_win') && winner.stats.wins >= 1)   newAchievements.push('first_win');
    if (!already('ten_wins')  && winner.stats.wins >= 10)  newAchievements.push('ten_wins');
    if (!already('fifty_wins')&& winner.stats.wins >= 50)  newAchievements.push('fifty_wins');
    if (!already('giant_slayer') && loser.lvl >= winner.lvl + 5) newAchievements.push('giant_slayer');

    // Shutout: opponent has 0 score in the whole game session
    const opponentScore = isP1Win ? game.score.p2 : game.score.p1;
    if (!already('shutout') && opponentScore === 0) newAchievements.push('shutout');

    // Speedrun: win a round in ≤15 total moves
    const totalMoves = game.p1_Moves.length + game.p2_Moves.length;
    if (!already('speedrun') && totalMoves <= 15) newAchievements.push('speedrun');

    return newAchievements;
};
