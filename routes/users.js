var express = require('express');
var router = express.Router();
const userController = require('../controllers/user.controller')

/* GET users listing. */
router.get('/:id', userController.getUser);
router.post('/signup', userController.createUser);
router.post('/signin', userController.signIn);

module.exports = router;
