const { Server } = require('socket.io')
const userModel = require('../models/user.model')
const gameModel = require('../models/game.model')
const gameService = require('../services/game.service')
const { resolveToken } = require('../middlewares/auth.middleware')
const { setIo, emitToUser, isOnline, userRoom, gameRoom } = require('./io')
const { allowedOrigins } = require('../configs/cors')

// Async handlers must never reject: an unhandled rejection would crash the whole server.
const safe = (fn) => async (...args) => {
    try {
        await fn(...args)
    } catch (err) {
        console.error('Socket handler error:', err)
    }
}

// Tell everyone who has this user in their friends list that they came online / went offline.
async function broadcastPresenceToFollowers (io, user, online) {
    const followers = await userModel.find({ friends: user.id }).select('_id').lean()
    for (const f of followers) emitToUser(f._id, 'presence', { userId: user.id, online })
}

module.exports = (server) => {
    const io = new Server(server, {
        cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
        pingInterval: 20000,
        pingTimeout: 20000,
    })
    setIo(io)

    io.use(async (socket, next) => {
        try {
            const user = await resolveToken(socket.handshake.auth?.token)
            if (!user) return next(new Error('unauthorized'))
            socket.data.user = user
            next()
        } catch (err) {
            next(err)
        }
    })

    io.on('connection', safe(async (socket) => {
        const user = socket.data.user
        const wasOnline = isOnline(user.id)
        socket.join(userRoom(user.id))
        if (!wasOnline) await broadcastPresenceToFollowers(io, user, true)

        // Players and spectators subscribe to a game's live updates. The ack tells the
        // caller which players are currently connected.
        socket.on('game:subscribe', safe(async (gameId, ack) => {
            if (typeof gameId !== 'string' || gameId.length > 64) return
            const game = await gameModel.findById(gameId).select('p1 p2').lean().catch(() => null)
            if (!game) return typeof ack === 'function' && ack({ ok: false })
            socket.join(gameRoom(gameId))
            const isPlayer = [game.p1, game.p2].some((p) => p && String(p) === user.id)
            if (isPlayer) socket.to(gameRoom(gameId)).emit('presence', { userId: user.id, online: true })
            if (typeof ack === 'function') {
                const online = {}
                for (const p of [game.p1, game.p2]) if (p) online[String(p)] = isOnline(p)
                ack({ ok: true, online })
            }
        }))

        socket.on('game:unsubscribe', (gameId) => {
            if (typeof gameId === 'string') socket.leave(gameRoom(gameId))
        })

        socket.on('chatMessage', safe(async (data) => {
            const message = typeof data?.message === 'string' ? data.message.trim() : ''
            if (!message || message.length > 200) return
            const players = await gameService.chatParticipants(data.gameId, user.id)
            if (!players) return
            const payload = { gameId: data.gameId, username: user.username, message, at: Date.now() }
            for (const p of players) emitToUser(p, 'chatMessage', payload)
        }))

        socket.on('disconnecting', safe(async () => {
            // Other tabs of the same user keep them online.
            const room = io.sockets.adapter.rooms.get(userRoom(user.id))
            if (room && room.size > 1) return
            for (const r of socket.rooms) {
                if (r.startsWith('game:')) socket.to(r).emit('presence', { userId: user.id, online: false })
            }
            await broadcastPresenceToFollowers(io, user, false)
        }))
    }))

    return io
}
