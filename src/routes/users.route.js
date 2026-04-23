var express = require('express');
var router = express.Router();
const userController = require('../controllers/user.controller')
const middleware = require('../middlewares/auth.middleware')

/* GET users listing. */
router.get('/leaderboard', middleware.authenticateToken, userController.getLeaderBoard);
router.get('/online-status', middleware.authenticateToken, userController.getOnlineStatus);
router.post('/pending-invites/dismiss', middleware.authenticateToken, userController.dismissPendingInvite);
router.get('/', middleware.authenticateToken, userController.getUser);

router.post('/handleFriend', middleware.authenticateToken, userController.handleFriend);
router.post('/signup', userController.createUser);
router.post('/signin', userController.signIn);

router.get('/:username', middleware.authenticateToken, userController.getUsersByUsername);
router.put('/:id', middleware.authenticateToken, userController.updateProfile);

module.exports = router;
