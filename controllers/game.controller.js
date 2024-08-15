const gameService = require("../services/game.service");

async function createGame(req, res, next) {
    try {
        const newGame = req.body;
        const result = await gameService.createGame(newGame);

        const { game } = result;
        res.status(201).json({
            data: game
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

module.exports = {
    getGame,
    createGame
}; 