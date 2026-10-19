const mongoose = require('mongoose')
const gameModel = require('../models/game.model')
const GameHistory = require('../models/gameHistory.model')
const userModel = require('../models/user.model')
const userService = require('./user.service')
const tournamentService = require('./tournament.service')
const { roundWinAchievements, totalsAchievements } = require('../utils/achievements')
const { buildBoard, dropRow, roundResult, findWinLine, pos, COLS } = require('../utils/board')
const { HttpError, assertObjectId } = require('../utils/http')
const { emitToGame, emitToUser } = require('../sockets/io')

const TURN_MS = 30 * 1000
// Small allowance for network latency when a client claims a timeout.
const TIMEOUT_GRACE_MS = 1500
const PLAYER_FIELDS = 'username avatar lvl'

// Serializes writes per game so two quick requests can't both act on the same state.
const locks = new Map()
function withGameLock (gameId, fn) {
    const key = String(gameId)
    const run = (locks.get(key) || Promise.resolve()).then(fn)
    const tail = run.catch(() => {})
    locks.set(key, tail)
    tail.then(() => { if (locks.get(key) === tail) locks.delete(key) })
    return run
}

const sameId = (a, b) => !!a && !!b && String(a._id || a) === String(b._id || b)
const other = (seat) => (seat === 'p1' ? 'p2' : 'p1')
const roundsPlayed = (game) => game.score.p1 + game.score.p2 + (game.score.draws || 0)
const currentTurn = (game) => (game.p1LastMove ? 'p2' : 'p1')

function seatOf (game, userId) {
    if (sameId(game.p1, userId)) return 'p1'
    if (sameId(game.p2, userId)) return 'p2'
    return null
}

async function findGame (gameId) {
    assertObjectId(gameId, 'Invalid game ID.')
    const game = await gameModel.findById(gameId)
    if (!game) throw new HttpError(404, 'This game no longer exists.')
    // Games saved before rounds were tracked server-side can hold a finished board without
    // roundEnd. Mark the round as over (the old client already counted the score).
    if (!game.roundEnd && game.p2) {
        const legacy = roundResult(game.p1_Moves, game.p2_Moves)
        if (legacy) {
            game.roundEnd = { winner: legacy, reason: legacy === 'draw' ? 'draw' : 'connect' }
            game.turnStartedAt = null
        }
    }
    return game
}

async function serialize (game) {
    await game.populate([
        { path: 'p1', select: PLAYER_FIELDS },
        { path: 'p2', select: PLAYER_FIELDS },
        { path: 'invitedUser', select: PLAYER_FIELDS },
    ])
    return { ...game.toObject(), turnMs: TURN_MS }
}

async function publish (game, event) {
    const data = await serialize(game)
    emitToGame(game._id, 'gameUpdate', { game: data, event, serverTime: Date.now() })
    return data
}

function startRound (game) {
    game.p1_Moves = []
    game.p2_Moves = []
    game.roundEnd = null
    game.rematchBy = null
    // Players alternate who opens each round.
    game.p1LastMove = roundsPlayed(game) % 2 === 1
    game.turnStartedAt = new Date()
}

// Persists the side effects of a decided round: stats, XP, history, achievements, brackets.
// ctx: { line, elapsedMs } describe the winning move, when there was one.
async function settleRound (game, winnerSeat, reason, ctx = {}) {
    const p1 = game.p1._id || game.p1
    const p2 = game.p2._id || game.p2
    if (winnerSeat === 'draw') {
        await GameHistory.create({ winner: p1, loser: p2, draw: true, reason: 'draw' })
        const { winner: a, loser: b } = await userService.recordRound({ winnerId: p1, loserId: p2, draw: true })
        await userService.grantAchievements(p1, ['stalemate', ...totalsAchievements(a)])
        await userService.grantAchievements(p2, ['stalemate', ...totalsAchievements(b)])
    } else {
        const winnerId = winnerSeat === 'p1' ? p1 : p2
        const loserId = winnerSeat === 'p1' ? p2 : p1
        await GameHistory.create({ winner: winnerId, loser: loserId, reason })
        const { winner, loser } = await userService.recordRound({ winnerId, loserId })
        await userService.grantAchievements(winnerId, [
            ...roundWinAchievements(winner, loser, { game, winnerSeat, reason, ...ctx }),
            ...totalsAchievements(winner),
        ])
        await userService.grantAchievements(loserId, totalsAchievements(loser))
    }
    if (game.tournamentId) {
        try {
            await tournamentService.handleGameUpdated(game._id)
        } catch (e) {
            console.error('Tournament advance error', e)
        }
    }
}

function endRound (game, winnerSeat, reason) {
    game.roundEnd = { winner: winnerSeat, reason }
    game.turnStartedAt = null
    game.rematchBy = null
    if (winnerSeat === 'draw') game.score.draws = (game.score.draws || 0) + 1
    else game.score[winnerSeat] += 1
}

function matchDecided (game) {
    return !!game.tournamentId && (game.score.p1 >= 2 || game.score.p2 >= 2)
}

exports.TURN_MS = TURN_MS

exports.createGame = async (me) => {
    const game = await gameModel.create({ p1: me.id })
    return serialize(game)
}

exports.getGame = async (gameId) => serialize(await findGame(gameId))

exports.inviteFriend = async (me, friendId) => {
    assertObjectId(friendId, 'Invalid user.')
    if (String(friendId) === me.id) throw new HttpError(400, "You can't invite yourself.")
    const friend = await userModel.findById(friendId).select('username').lean()
    if (!friend) throw new HttpError(404, 'User not found.')

    const game = await gameModel.create({ p1: me.id, invitedUser: friendId })
    await userService.addPendingGameInvite(friendId, game._id, me.username)
    const from = await userService.getPublicUser(me.id)
    emitToUser(friendId, 'gameInvite', { gameId: String(game._id), from })
    return serialize(game)
}

exports.declineInvite = (me, gameId) => withGameLock(gameId, async () => {
    const game = await findGame(gameId)
    if (!sameId(game.invitedUser, me.id) || game.p2) throw new HttpError(400, 'There is no pending invite for this game.')
    await userService.removePendingGameInvite(me.id, game._id)
    await game.deleteOne()
    emitToUser(game.p1, 'inviteDeclined', { gameId: String(game._id), username: me.username })
    emitToGame(game._id, 'gameUpdate', { game: null, gameId: String(game._id), event: { type: 'declined', by: me.username } })
})

exports.joinGame = (me, gameId) => withGameLock(gameId, async () => {
    const game = await findGame(gameId)
    if (seatOf(game, me.id)) return serialize(game)
    if (game.p2) throw new HttpError(409, 'This game is already full. You can still watch it.')
    if (game.tournamentId) throw new HttpError(403, 'This is a tournament match.')
    if (game.invitedUser && !sameId(game.invitedUser, me.id)) throw new HttpError(403, 'This game is reserved for an invited player.')

    game.p2 = me.id
    game.invitedUser = null
    game.turnStartedAt = new Date()
    await game.save()
    await userService.removePendingGameInvite(me.id, game._id)

    const data = await publish(game, { type: 'joined', by: me.username })
    // The host may be on another page; their first turn clock is already running.
    emitToUser(game.p1._id, 'inviteAccepted', { gameId: String(game._id), username: me.username })
    return data
})

exports.playMove = (me, gameId, col) => withGameLock(gameId, async () => {
    col = Number(col)
    if (!Number.isInteger(col) || col < 0 || col >= COLS) throw new HttpError(400, 'Invalid column.')
    const game = await findGame(gameId)
    const seat = seatOf(game, me.id)
    if (!seat) throw new HttpError(403, "You're not a player in this game.")
    if (!game.p2) throw new HttpError(409, 'Waiting for an opponent to join.')
    if (game.roundEnd) throw new HttpError(409, 'This round is over.')
    if (currentTurn(game) !== seat) throw new HttpError(409, "It's not your turn.")

    const row = dropRow(buildBoard(game.p1_Moves, game.p2_Moves), col)
    if (row === -1) throw new HttpError(409, 'This column is full.')

    const move = pos(row, col)
    const elapsedMs = game.turnStartedAt ? Date.now() - game.turnStartedAt.getTime() : null
    game[`${seat}_Moves`].push(move)
    game.p1LastMove = seat === 'p1'
    game.turnStartedAt = new Date()

    const result = roundResult(game.p1_Moves, game.p2_Moves)
    if (result) endRound(game, result, result === 'draw' ? 'draw' : 'connect')
    await game.save()
    if (result) {
        const line = result === 'draw' ? null : findWinLine(buildBoard(game.p1_Moves, game.p2_Moves), result)
        await settleRound(game, result, result === 'draw' ? 'draw' : 'connect', { line, elapsedMs })
    }

    return publish(game, { type: result ? 'roundEnd' : 'move', by: me.username, move })
})

// Ends the round in the opponent's favour: either the mover ran out of time, or a player resigns.
exports.forfeitRound = (me, gameId, reason) => withGameLock(gameId, async () => {
    const game = await findGame(gameId)
    const seat = seatOf(game, me.id)
    if (!seat) throw new HttpError(403, "You're not a player in this game.")
    if (!game.p2 || game.roundEnd) throw new HttpError(409, 'There is no round in progress.')

    let loser
    if (reason === 'resign') {
        loser = seat
    } else {
        if (!game.turnStartedAt) throw new HttpError(409, 'The turn timer has not started.')
        if (Date.now() - game.turnStartedAt.getTime() < TURN_MS - TIMEOUT_GRACE_MS) {
            throw new HttpError(409, "The turn hasn't timed out yet.")
        }
        loser = currentTurn(game)
        reason = 'timeout'
    }
    const winner = other(loser)
    endRound(game, winner, reason)
    await game.save()
    await settleRound(game, winner, reason)
    return publish(game, { type: 'roundEnd', by: me.username })
})

exports.requestRematch = (me, gameId) => withGameLock(gameId, async () => {
    const game = await findGame(gameId)
    if (!seatOf(game, me.id)) throw new HttpError(403, "You're not a player in this game.")
    if (!game.roundEnd) throw new HttpError(409, 'Finish the current round first.')
    if (matchDecided(game)) throw new HttpError(409, 'This tournament match is over.')

    if (game.rematchBy && !sameId(game.rematchBy, me.id)) {
        startRound(game)
        await game.save()
        return publish(game, { type: 'newRound', by: me.username })
    }
    game.rematchBy = me.id
    await game.save()
    return publish(game, { type: 'rematchRequested', by: me.username })
})

exports.listActiveGames = async () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000)
    return gameModel
        .find({ p2: { $ne: null }, updatedAt: { $gte: recent } })
        .select('p1 p2 score p1_Moves p2_Moves updatedAt tournamentId')
        .populate('p1', PLAYER_FIELDS)
        .populate('p2', PLAYER_FIELDS)
        .sort({ updatedAt: -1 })
        .limit(25)
        .lean()
}

exports.getHistory = (meId) =>
    GameHistory.find({ $or: [{ winner: meId }, { loser: meId }] })
        .populate('winner', 'username avatar')
        .populate('loser', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()

// Only players may chat in a game. Returns both player ids, or null.
exports.chatParticipants = async (gameId, userId) => {
    if (!mongoose.isValidObjectId(gameId)) return null
    const game = await gameModel.findById(gameId).select('p1 p2').lean()
    if (!game || !game.p2 || !seatOf(game, userId)) return null
    return [game.p1, game.p2]
}
