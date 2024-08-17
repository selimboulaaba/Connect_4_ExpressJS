const gameService = require("../services/game.service");
const jwt = require('jsonwebtoken');

async function createGame(req, res, next) {
    try {
        const newGame = req.body;
        const result = await gameService.createGame(newGame);

        const { game } = result;
        res.status(201).json({
            game: game
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

async function getGame(req, res, next) {
    try {
        res.json(await gameService.getGame(req.params.id));
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

async function joinGame(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

        const result = await gameService.joinGame(req.params.id, decoded.username);
        const { game } = result;

        try {
            const io = req.app.get('io');
            const users = req.app.get('users');
            const username = game.p1.username;
            const socketId = users[username];
            if (socketId) {
                io.to(socketId).emit('gameJoined', { newGame: game });
            } else {
                console.log(`User with username ${username} is not connected.`);
            }
        } catch (error) {
            console.log("Socket Error.")
        }

        res.json({
            game: game
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

async function updateMove(req, res, next) {
    try {
        const newMove = req.body;
        const result = await gameService.updateMove(req.params.id, newMove);
        const { game } = result;

        try {
            const io = req.app.get('io');
            const users = req.app.get('users');
            const username = req.body.username;
            const socketId = users[username];
            if (socketId) {
                io.to(socketId).emit('newMove', { newGame: game });
            } else {
                console.log(`User with username ${username} is not connected.`);
            }
        } catch (error) {
            console.log("Socket Error.")
        }

        res.json({
            game: game
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

module.exports = {
    getGame,
    createGame,
    joinGame,
    updateMove
}; 