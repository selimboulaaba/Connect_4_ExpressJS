const userService = require("../services/user.services");

async function createUser(req, res, next) {
    try {
        const newUser = req.body;
        const result = await userService.signup(newUser);

        const { user } = result;
        res.status(201).json({
            message: `User with username ${user.username} signed up successfully`,
        });
        next();
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

async function signIn(req, res) {
    try {
        const User = req.body;
        const result = await userService.signin(User);

        const { user } = result;
        res.status(201).json({
            data: user,
            message: `User with username ${user.username} signed in successfully`,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

async function getUser(req, res, next) {
    try {
        res.json(await userService.getUser(req.params.id));
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

module.exports = {
    createUser,
    getUser,
    signIn
}; 