const cron = require('node-cron')
const gameModel = require('../models/game.model')

const HOUR = 60 * 60 * 1000

const run = (name, fn) => async () => {
    try {
        await fn()
    } catch (err) {
        console.error(`Cleanup job "${name}" failed:`, err)
    }
}

module.exports = function scheduleCleanup () {
    // Games nobody has touched for a week.
    cron.schedule('30 2 * * *', run('old games', () =>
        gameModel.deleteMany({ updatedAt: { $lt: new Date(Date.now() - 7 * 24 * HOUR) } })
    ))

    // Abandoned lobbies: two players but no move for 2 hours, or nobody joined within 48 hours.
    // Tournament matches are left alone so a bracket never loses a game.
    cron.schedule('15 * * * *', run('abandoned games', async () => {
        await gameModel.deleteMany({
            tournamentId: null,
            p2: { $ne: null },
            p1_Moves: { $size: 0 },
            p2_Moves: { $size: 0 },
            'score.p1': 0,
            'score.p2': 0,
            updatedAt: { $lt: new Date(Date.now() - 2 * HOUR) },
        })
        await gameModel.deleteMany({
            tournamentId: null,
            p2: null,
            updatedAt: { $lt: new Date(Date.now() - 48 * HOUR) },
        })
    }))
}
