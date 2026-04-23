const userModel = require('../models/user.model')
const gameModel = require('../models/game.model')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');

exports.signup = async (newUser) => {
    const existingUser = await userModel.findOne({ username: newUser.username });
    if (existingUser) {
        throw new Error('Username exists Already.');
    }
    newUser.password = await bcrypt.hash(newUser.password, 12)
    const user = await userModel.create(newUser)
    return {
        user
    }
}

exports.signin = async (credentials) => {
    const user = await userModel.findOne({ username: credentials.username }).populate('friends');
    if (!user) {
        throw new Error('Wrong Username.');
    }
    const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
    if (!isPasswordCorrect) {
        throw new Error('Wrong Password.');
    }
    const token = generateAccessToken(credentials.username)
    return { user, token };
};

function generateAccessToken(username) {
    return jwt.sign({ username }, process.env.TOKEN_SECRET, { expiresIn: '2d' });
}

exports.sanitizePendingInvites = async (user) => {
    if (!user.pendingGameInvites?.length) return
    const kept = []
    for (const inv of user.pendingGameInvites) {
        const gid = inv.game?._id || inv.game
        if (gid && (await gameModel.exists({ _id: gid }))) kept.push(inv)
    }
    if (kept.length !== user.pendingGameInvites.length) {
        user.pendingGameInvites = kept
        await user.save()
    }
}

exports.addPendingGameInvite = async (recipientId, gameId, fromUsername) => {
    const rid = recipientId?.toString ? recipientId.toString() : String(recipientId)
    const gid = gameId?.toString ? gameId.toString() : String(gameId)
    await userModel.updateOne({ _id: rid }, { $pull: { pendingGameInvites: { game: gid } } })
    await userModel.updateOne(
        { _id: rid },
        { $push: { pendingGameInvites: { game: gid, fromUsername, createdAt: new Date() } } }
    )
}

exports.removePendingGameInvite = async (userId, gameId) => {
    const uid = userId?.toString ? userId.toString() : String(userId)
    const gid = gameId?.toString ? gameId.toString() : String(gameId)
    await userModel.updateOne({ _id: uid }, { $pull: { pendingGameInvites: { game: gid } } })
}

exports.getUserByUsername = async (username) => {
    const user = await userModel.findOne({ username })
        .populate('friends')
        .populate('pendingGameInvites.game', '_id')
    if (user?.pendingGameInvites?.length) {
        await exports.sanitizePendingInvites(user)
        await user.populate('pendingGameInvites.game', '_id')
    }
    return {
        user
    }
}

exports.getUsersByUsername = async (username) => {
    const users = await userModel.find({
        username: {
            $regex: username,
            $options: 'i'
        }
    });
    return {
        users
    }
}

exports.handleFriend = async (username, friendId) => {
    const user = await userModel.findOne({ username });
    if (user.friends.includes(friendId)) {
        user.friends = user.friends.filter(fId => fId.toString() !== friendId)
    } else {
        user.friends.push(friendId)
    }
    await user.save();
    await user.populate('friends')
    return {
        user
    }
}

exports.updateProfile = async (username, id, payload) => {
    const user = await userModel.findById(id);
    if (!user) {
        throw new Error('Wrong Username.');
    }
    if (user.username !== username) {
        throw new Error('User Not Authorized.');
    }
    const nextUsername = payload.username !== undefined && payload.username !== ''
        ? payload.username
        : user.username
    if (nextUsername !== user.username) {
        const taken = await userModel.findOne({ username: nextUsername })
        if (taken) {
            throw new Error('Username Already Exists.');
        }
        user.username = nextUsername
    }
    if (!!payload.password) {
        user.password = await bcrypt.hash(payload.password, 12)
    }
    if (payload.avatar && /^avatar_(?:[1-9]|1[0-2])$/.test(payload.avatar)) {
        user.avatar = payload.avatar
    }
    const token = generateAccessToken(user.username)

    await user.save();
    await user.populate('friends')
    return {
        user,
        token
    }
}

exports.getUserById = async (id) => {
    const user = await userModel.findById(id)
    return {
        user
    }
}

exports.updateExperience = async (id, req) => {
    const user = await userModel.findById(id)
    user.xp += 33
    if (user.xp >= 100 && user.xp < 250) {
        user.lvl = 2
    } else if (user.xp >= 250) {
        const level = Math.floor((Math.log(user.xp / 250) / Math.log(2)) + 3);
        user.lvl = level
    }

    try {
        const io = req.app.get('io');
        const users = req.app.get('users');
        const socketId = users[user.username];
        if (socketId) {
            io.to(socketId).emit('updateExperience', { xp: user.xp, lvl: user.lvl });
        } else {
            console.log(`User with username ${user.username} is not connected.`);
        }
    } catch (error) {
        console.log("Socket Error.")
    }
    await user.save();
}

exports.addXP = async (userId, amount, req) => {
    const user = await userModel.findById(userId)
    if (!user) throw new Error('User not found.')
    user.xp += amount
    if (user.xp >= 100 && user.xp < 250) {
        user.lvl = 2
    } else if (user.xp >= 250) {
        const level = Math.floor((Math.log(user.xp / 250) / Math.log(2)) + 3)
        user.lvl = level
    }
    try {
        const io = req.app.get('io')
        const users = req.app.get('users')
        const socketId = users[user.username]
        if (socketId) {
            io.to(socketId).emit('updateExperience', { xp: user.xp, lvl: user.lvl })
        }
    } catch (error) {
        console.log('Socket Error (addXP).')
    }
    await user.save()
}

exports.getLeaderBoard = async () => {
    const users = await userModel.find({}).sort({ xp: 'desc' })
    return {
        users
    }
}

exports.updateStats = async (winnerId, loserId, req) => {
    const winner = await userModel.findByIdAndUpdate(winnerId, { $inc: { 'stats.wins': 1 } }, { new: true })
    const loser  = await userModel.findByIdAndUpdate(loserId,  { $inc: { 'stats.losses': 1 } }, { new: true })
    try {
        const io = req.app.get('io');
        const users = req.app.get('users');
        const winnerSocketId = users[winner.username];
        const loserSocketId  = users[loser.username];
        if (winnerSocketId) io.to(winnerSocketId).emit('updateStats', { stats: winner.stats });
        if (loserSocketId)  io.to(loserSocketId).emit('updateStats', { stats: loser.stats });
    } catch (error) {
        console.log('Socket Error (updateStats).');
    }
}

exports.getOnlineStatus = async (username, users) => {
    const user = await userModel.findOne({ username }).populate('friends')
    if (!user) return { onlineFriends: {} }
    const onlineFriends = {}
    for (const friend of user.friends) {
        onlineFriends[friend.username] = !!users[friend.username]
    }
    return { onlineFriends }
}

