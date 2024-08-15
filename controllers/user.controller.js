const userService = require("../services/user.service");
const jwt = require('jsonwebtoken');

async function createUser(req, res, next) {
    try {
        const newUser = req.body;
        const result = await userService.signup(newUser);

        const { user } = result;
        res.status(201).json({
            message: `User with username ${user.username} signed up successfully`,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

async function signIn(req, res) {
    try {
        const User = req.body;
        const result = await userService.signin(User);

        const { user, token } = result;
        res.status(201).json({
            user: user,
            token: token,
            message: `User with username ${user.username} signed in successfully`,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

async function getUser(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        res.json(await userService.getUser(decoded.username));
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

module.exports = {
    createUser,
    getUser,
    signIn
}; 