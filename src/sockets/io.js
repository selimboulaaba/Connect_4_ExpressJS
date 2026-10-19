// Holds the Socket.IO server so services can push events without threading `req` around.
// Every authenticated socket joins `user:<id>`; games broadcast to `game:<id>`.
let io = null

const userRoom = (userId) => `user:${userId}`
const gameRoom = (gameId) => `game:${gameId}`

function setIo (server) {
    io = server
}

function emitToUser (userId, event, payload) {
    if (io && userId) io.to(userRoom(String(userId))).emit(event, payload)
}

function emitToGame (gameId, event, payload) {
    if (io && gameId) io.to(gameRoom(String(gameId))).emit(event, payload)
}

function isOnline (userId) {
    if (!io || !userId) return false
    const room = io.sockets.adapter.rooms.get(userRoom(String(userId)))
    return !!room && room.size > 0
}

module.exports = { setIo, emitToUser, emitToGame, isOnline, userRoom, gameRoom }
