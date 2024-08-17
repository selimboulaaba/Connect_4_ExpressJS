var express = require('express');
var router = express.Router();
const gameController = require('../controllers/game.controller')
const middleware = require('../middlewares/auth.middleware')

router.post('/', middleware.authenticateToken, gameController.createGame);
router.get('/:id', middleware.authenticateToken, gameController.getGame);
router.put('/move/:id', middleware.authenticateToken, gameController.updateMove);
router.put('/:id', middleware.authenticateToken, gameController.joinGame);

module.exports = router;
