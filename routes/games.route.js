var express = require('express');
var router = express.Router();
const gameController = require('../controllers/game.controller')

router.get('/:id', gameController.getGame);
router.post('/', gameController.createGame);

module.exports = router;
