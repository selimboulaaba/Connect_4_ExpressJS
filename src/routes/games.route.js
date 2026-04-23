var express = require('express');
var router = express.Router();
const gameController = require('../controllers/game.controller')
const middleware = require('../middlewares/auth.middleware')

router.post('/', middleware.authenticateToken, gameController.createGame);
router.post('/invite', middleware.authenticateToken, gameController.inviteFriend);
router.get('/history', middleware.authenticateToken, gameController.getHistory);
router.get('/active', middleware.authenticateToken, gameController.listActiveGames);
router.get('/:id', middleware.authenticateToken, gameController.getGame);
router.put('/move/:id', middleware.authenticateToken, gameController.updateMove);
router.put('/:id', middleware.authenticateToken, gameController.joinGame);
router.post('/rematch/:id', middleware.authenticateToken, gameController.requestRematch);

module.exports = router;
