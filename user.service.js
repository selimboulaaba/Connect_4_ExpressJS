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
    const user = await userModel.findOne({ username: credentials.username });
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

exports.getUser = async (username) => {
    const user = await userModel.findOne({ username })
    return {
        user
    }
}

function generateAccessToken(username) {
    return jwt.sign({ username }, process.env.TOKEN_SECRET, { expiresIn: '2d' });
}