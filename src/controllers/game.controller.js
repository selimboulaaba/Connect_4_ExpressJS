const gameService = require('../services/game.service')
const { asyncHandler } = require('../utils/http')

// serverTime lets clients sync the turn countdown regardless of their own clock.
const send = (res, game, status = 200) => res.status(status).json({ game, serverTime: Date.now() })

const createGame = asyncHandler(async (req, res) => {
    send(res, await gameService.createGame(req.user), 201)
})

const getGame = asyncHandler(async (req, res) => {
    send(res, await gameService.getGame(req.params.id))
})

const joinGame = asyncHandler(async (req, res) => {
    send(res, await gameService.joinGame(req.user, req.params.id))
})

const playMove = asyncHandler(async (req, res) => {
    send(res, await gameService.playMove(req.user, req.params.id, req.body?.col))
})

const forfeitRound = asyncHandler(async (req, res) => {
    const reason = req.body?.reason === 'resign' ? 'resign' : 'timeout'
    send(res, await gameService.forfeitRound(req.user, req.params.id, reason))
})

const requestRematch = asyncHandler(async (req, res) => {
    send(res, await gameService.requestRematch(req.user, req.params.id))
})

const inviteFriend = asyncHandler(async (req, res) => {
    send(res, await gameService.inviteFriend(req.user, req.body?.friendId), 201)
})

const declineInvite = asyncHandler(async (req, res) => {
    await gameService.declineInvite(req.user, req.params.id)
    res.json({ ok: true })
})

const listActiveGames = asyncHandler(async (req, res) => {
    res.json({ games: await gameService.listActiveGames() })
})

const getHistory = asyncHandler(async (req, res) => {
    res.json({ history: await gameService.getHistory(req.user.id) })
})

module.exports = {
    createGame,
    getGame,
    joinGame,
    playMove,
    forfeitRound,
    requestRematch,
    inviteFriend,
    declineInvite,
    listActiveGames,
    getHistory,
}
