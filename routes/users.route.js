var express = require('express');
var router = express.Router();
const userController = require('../controllers/user.controller')
const middleware = require('../middlewares/auth.middleware')

/* GET users listing. */
router.get('/', middleware.authenticateToken, userController.getUser);
router.post('/signup', userController.createUser);
router.post('/signin', userController.signIn);

module.exports = router;
