const Tournament = require('../models/tournament.model')
const gameModel = require('../models/game.model')
const { HttpError, assertObjectId } = require('../utils/http')
const { emitToUser } = require('../sockets/io')

// Lets every player's lobby refresh as soon as the bracket changes.
function notifyPlayers (t) {
    for (const p of t.players) emitToUser(p._id || p, 'tournamentUpdate', { tournamentId: String(t._id) })
}

exports.createTournament = async (hostId, name) => {
    const t = await Tournament.create({
        host: hostId,
        players: [hostId],
        name: (typeof name === 'string' && name.trim().slice(0, 40)) || 'Bracket',
    })
    return t
}

exports.getTournament = async (id) => {
    assertObjectId(id, 'Invalid tournament ID.')
    return Tournament.findById(id)
        .populate('host', 'username avatar')
        .populate('players', 'username avatar')
        .populate({ path: 'semiGameIds', select: 'p1 p2 score', populate: { path: 'p1 p2', select: 'username avatar' } })
        .populate({ path: 'finalGameId', select: 'p1 p2 score', populate: { path: 'p1 p2', select: 'username avatar' } })
        .populate('championId', 'username avatar')
}

exports.joinTournament = async (tournamentId, userId) => {
    assertObjectId(tournamentId, 'Invalid tournament ID.')
    const t = await Tournament.findById(tournamentId)
    if (!t) throw new HttpError(400, 'Tournament not found.')
    if (t.status !== 'waiting') throw new HttpError(400, 'Tournament already started.')
    if (t.players.length >= t.maxPlayers) throw new HttpError(400, 'Tournament is full.')
    if (t.players.some((p) => p.toString() === userId.toString())) throw new HttpError(400, 'Already joined.')
    t.players.push(userId)
    await t.save()
    notifyPlayers(t)
    return exports.getTournament(t._id)
}

exports.startTournament = async (tournamentId, hostId) => {
    assertObjectId(tournamentId, 'Invalid tournament ID.')
    const t = await Tournament.findById(tournamentId)
    if (!t) throw new HttpError(400, 'Tournament not found.')
    if (t.host.toString() !== hostId.toString()) throw new HttpError(400, 'Only the host can start.')
    if (t.players.length !== 4) throw new HttpError(400, 'Need exactly 4 players to start.')
    if (t.status !== 'waiting') throw new HttpError(400, 'Already started.')

    const shuffled = [...t.players].sort(() => Math.random() - 0.5)
    const g1 = await gameModel.create({
        p1: shuffled[0],
        p2: shuffled[1],
        tournamentId: t._id,
    })
    const g2 = await gameModel.create({
        p1: shuffled[2],
        p2: shuffled[3],
        tournamentId: t._id,
    })

    t.semiGameIds = [g1._id, g2._id]
    t.semiWinners = [null, null]
    t.status = 'semifinals'
    await t.save()
    notifyPlayers(t)
    return exports.getTournament(t._id)
}

/**
 * Call after a game is saved. First-to-2 (round wins) wins the bracket match.
 */
exports.handleGameUpdated = async (gameId) => {
    const game = await gameModel.findById(gameId)
    if (!game || !game.tournamentId) return

    const t = await Tournament.findById(game.tournamentId)
    if (!t || t.status === 'complete') return

    const p1Score = game.score.p1
    const p2Score = game.score.p2
    if (p1Score < 2 && p2Score < 2) return

    const winnerId = p1Score >= 2 ? game.p1 : game.p2

    if (t.status === 'semifinals') {
        const idx = t.semiGameIds.findIndex((id) => id.equals(game._id))
        if (idx === -1) return

        const next = Array(t.semiGameIds.length).fill(null)
        ;(t.semiWinners || []).forEach((w, i) => {
            if (w) next[i] = w
        })
        next[idx] = winnerId
        t.semiWinners = next

        const done = next.every((w) => !!w)
        if (done) {
            const finalGame = await gameModel.create({
                p1: t.semiWinners[0],
                p2: t.semiWinners[1],
                tournamentId: t._id,
            })
            t.finalGameId = finalGame._id
            t.status = 'final'
        }
        await t.save()
        notifyPlayers(t)
        return
    }

    if (t.status === 'final' && t.finalGameId && game._id.equals(t.finalGameId)) {
        if (p1Score < 2 && p2Score < 2) return
        t.championId = winnerId
        t.status = 'complete'
        await t.save()
        notifyPlayers(t)
    }
}
