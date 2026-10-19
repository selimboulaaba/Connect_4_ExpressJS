const bcrypt = require('bcrypt')
const userModel = require('../models/user.model')
const gameModel = require('../models/game.model')
const { HttpError, assertObjectId } = require('../utils/http')
const { signToken } = require('../middlewares/auth.middleware')
const { levelForXp, XP } = require('../utils/level')
const { emitToUser, isOnline } = require('../sockets/io')

// Cost 10 keeps sign-in fast on small instances; existing cost-12 hashes still verify.
const BCRYPT_ROUNDS = 10
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,20}$/
const PUBLIC = userModel.PUBLIC_FIELDS

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function validateUsername (username) {
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
        throw new HttpError(400, 'Username must be 3-20 characters: letters, numbers, "_", "-" or ".".')
    }
}

function validatePassword (password) {
    if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
        throw new HttpError(400, 'Password must be between 6 and 72 characters.')
    }
}

async function usernameTaken (username, exceptId = null) {
    const query = { username: new RegExp(`^${escapeRegex(username)}$`, 'i') }
    if (exceptId) query._id = { $ne: exceptId }
    return !!(await userModel.exists(query))
}

exports.signup = async ({ username, password } = {}) => {
    username = typeof username === 'string' ? username.trim() : username
    validateUsername(username)
    validatePassword(password)
    if (await usernameTaken(username)) throw new HttpError(409, 'This username is already taken.')
    const user = await userModel.create({ username, password: await bcrypt.hash(password, BCRYPT_ROUNDS) })
    return { user: await exports.getMe(user._id), token: signToken(user) }
}

exports.signin = async ({ username, password } = {}) => {
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        throw new HttpError(400, 'Enter your username and password.')
    }
    const user = await userModel.findOne({ username: username.trim() }).select('+password')
    // Same message for both cases so usernames can't be probed.
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new HttpError(401, 'Wrong username or password.')
    }
    return { user: await exports.getMe(user._id), token: signToken(user) }
}

// Drops invites whose game was deleted (declined, expired, cleaned up).
async function sanitizePendingInvites (user) {
    if (!user.pendingGameInvites?.length) return
    const ids = user.pendingGameInvites.map((inv) => inv.game).filter(Boolean)
    const existing = await gameModel.find({ _id: { $in: ids }, p2: null }).select('_id').lean()
    const alive = new Set(existing.map((g) => String(g._id)))
    const kept = user.pendingGameInvites.filter((inv) => alive.has(String(inv.game)))
    if (kept.length !== user.pendingGameInvites.length) {
        user.pendingGameInvites = kept
        await user.save()
    }
}

exports.getMe = async (id) => {
    const user = await userModel.findById(id)
    if (!user) throw new HttpError(404, 'User not found.')
    await sanitizePendingInvites(user)
    await user.populate('friends', PUBLIC)
    return user
}

exports.getPublicUser = (id) => userModel.findById(id).select(PUBLIC).lean()

exports.searchUsers = async (query, meId) => {
    const q = typeof query === 'string' ? query.trim().slice(0, 20) : ''
    if (!q) return []
    return userModel
        .find({ username: { $regex: escapeRegex(q), $options: 'i' }, _id: { $ne: meId } })
        .select(PUBLIC)
        .sort({ xp: -1 })
        .limit(10)
        .lean()
}

exports.toggleFriend = async (meId, friendId) => {
    assertObjectId(friendId, 'Invalid user.')
    if (String(friendId) === String(meId)) throw new HttpError(400, "You can't add yourself.")
    if (!(await userModel.exists({ _id: friendId }))) throw new HttpError(404, 'User not found.')
    const me = await userModel.findById(meId)
    const isFriend = me.friends.some((f) => String(f) === String(friendId))
    await userModel.updateOne({ _id: meId }, isFriend ? { $pull: { friends: friendId } } : { $addToSet: { friends: friendId } })
    return exports.getMe(meId)
}

exports.updateProfile = async (meId, targetId, payload = {}) => {
    if (String(meId) !== String(targetId)) throw new HttpError(403, 'You can only edit your own profile.')
    const user = await userModel.findById(meId)
    if (!user) throw new HttpError(404, 'User not found.')

    if (payload.username !== undefined && payload.username !== '' && payload.username !== user.username) {
        const next = String(payload.username).trim()
        validateUsername(next)
        if (await usernameTaken(next, user._id)) throw new HttpError(409, 'This username is already taken.')
        user.username = next
    }
    if (payload.password) {
        validatePassword(payload.password)
        user.password = await bcrypt.hash(payload.password, BCRYPT_ROUNDS)
    }
    if (payload.avatar !== undefined) {
        if (!/^avatar_(?:[1-9]|1[0-2])$/.test(payload.avatar)) throw new HttpError(400, 'Unknown avatar.')
        user.avatar = payload.avatar
    }
    await user.save()
    return { user: await exports.getMe(user._id), token: signToken(user) }
}

function pushProfile (user) {
    emitToUser(user._id, 'profileUpdate', {
        xp: user.xp,
        lvl: user.lvl,
        stats: user.stats,
        achievements: user.achievements,
    })
}

exports.addXP = async (userId, amount) => {
    const user = await userModel.findByIdAndUpdate(userId, { $inc: { xp: amount } }, { new: true })
    if (!user) throw new HttpError(404, 'User not found.')
    const lvl = levelForXp(user.xp)
    if (lvl !== user.lvl) {
        user.lvl = lvl
        await userModel.updateOne({ _id: userId }, { lvl })
    }
    pushProfile(user)
    return user
}

// Updates stats + XP for a finished round and pushes the new numbers to both players.
exports.recordRound = async ({ winnerId, loserId, draw }) => {
    if (draw) {
        await userModel.updateMany({ _id: { $in: [winnerId, loserId] } }, { $inc: { 'stats.draws': 1 } })
        const [a, b] = await Promise.all([exports.addXP(winnerId, XP.DRAW), exports.addXP(loserId, XP.DRAW)])
        return { winner: a, loser: b }
    }
    await Promise.all([
        userModel.updateOne({ _id: winnerId }, { $inc: { 'stats.wins': 1 } }),
        userModel.updateOne({ _id: loserId }, { $inc: { 'stats.losses': 1 } }),
    ])
    const winner = await exports.addXP(winnerId, XP.WIN)
    const loser = await userModel.findById(loserId)
    pushProfile(loser)
    return { winner, loser }
}

exports.unlockAchievements = async (userId, ids) => {
    if (!ids.length) return
    const user = await userModel.findByIdAndUpdate(userId, { $addToSet: { achievements: { $each: ids } } }, { new: true })
    pushProfile(user)
}

exports.getLeaderBoard = () =>
    userModel.find({}).select(PUBLIC).sort({ xp: -1, 'stats.wins': -1 }).limit(50).lean()

// { [friendId]: boolean }
exports.getOnlineStatus = async (meId) => {
    const user = await userModel.findById(meId).select('friends').lean()
    const status = {}
    for (const id of user?.friends || []) status[String(id)] = isOnline(id)
    return status
}

exports.addPendingGameInvite = async (recipientId, gameId, fromUsername) => {
    await userModel.updateOne({ _id: recipientId }, { $pull: { pendingGameInvites: { game: gameId } } })
    await userModel.updateOne(
        { _id: recipientId },
        { $push: { pendingGameInvites: { game: gameId, fromUsername, createdAt: new Date() } } }
    )
}

exports.removePendingGameInvite = (userId, gameId) =>
    userModel.updateOne({ _id: userId }, { $pull: { pendingGameInvites: { game: gameId } } })
