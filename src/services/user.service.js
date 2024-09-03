const userModel = require('../models/user.model')
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

exports.getUserByUsername = async (username) => {
    const user = await userModel.findOne({ username })
        .populate('friends')
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
    if (await userModel.findOne({ username: payload.username })) {
        throw new Error('Username Already Exists.');
    }
    user.username = payload.username;
    if (!!payload.password) {
        user.password = await bcrypt.hash(payload.password, 12)
    }
    const token = generateAccessToken(payload.username)

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
            console.log(`User with username ${username} is not connected.`);
        }
    } catch (error) {
        console.log("Socket Error.")
    }
    await user.save();
}

exports.getLeaderBoard = async () => {
    const users = await userModel.find({}).sort({ xp: 'desc' })
    return {
        users
    }
}

