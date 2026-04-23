var socketIo = require('socket.io');
const gameService = require("../services/game.service");
const userService = require("../services/user.service");

module.exports = (server, app) => {
    const io = socketIo(server, {
        cors: {
            origin: process.env.FRONT_URL,
            methods: ['GET', 'POST'],
            credentials: true
        }
    });
    app.set('io', io);

    const users = {};
    app.set('users', users);

    io.on('connection', async (socket) => {
        let connectedUser = "";
        socket.on('register', (username) => {
            if (typeof username === 'string') {
                connectedUser = username;
                users[username] = socket.id;
                app.set('users', users);
            }
        });

        socket.on('acceptInvite', async (inviteData) => {
            try {
                const inviteeId = inviteData.newGame.p2?._id || inviteData.newGame.p2
                const gid = inviteData.newGame._id
                await userService.removePendingGameInvite(inviteeId, gid)
            } catch (e) {
                console.log('acceptInvite pending cleanup', e.message)
            }
            const user = await userService.getUserById(inviteData.newGame.p1)
            const user2 = await userService.getUserById(inviteData.newGame.p2)
            const recipientSocketId = users[user.user.username];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('inviteAccepted', { gameId: inviteData.newGame._id, username: user2.user.username });
            } else {
                console.log('User not found');
            }
        });

        socket.on('declineInvite', async (inviteData) => {
            try {
                const inviteeId = inviteData.newGame.p2?._id || inviteData.newGame.p2
                const gid = inviteData.newGame._id
                await userService.removePendingGameInvite(inviteeId, gid)
            } catch (e) {
                console.log('declineInvite pending cleanup', e.message)
            }
            const user = await userService.getUserById(inviteData.newGame.p1)
            const user2 = await userService.getUserById(inviteData.newGame.p2)
            const recipientSocketId = users[user.user.username];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('inviteDeclined', { username: user2.user.username });
            } else {
                console.log('User not found');
            }
        });

        socket.on('chatMessage', (data) => {
            // data: { opponentUsername, username, message }
            if (!data.message || data.message.length > 100) return;
            const payload = {
                username: data.username,
                message: data.message,
            };
            const opponentSocketId = users[data.opponentUsername];
            if (opponentSocketId) {
                io.to(opponentSocketId).emit('chatMessage', payload);
            }
            if (users[data.username]) {
                io.to(users[data.username]).emit('chatMessage', payload);
            }
        });

        socket.on('spectateGame', (gameId) => {
            if (typeof gameId === 'string' && gameId.length < 64) {
                socket.join(`spectators:${gameId}`);
            }
        });

        socket.on('stopSpectating', (gameId) => {
            if (typeof gameId === 'string') {
                socket.leave(`spectators:${gameId}`);
            }
        });

        socket.on('disconnect', () => {
            clearInterval(intervalId);
            for (let username in users) {
                if (users[username] === socket.id) {
                    delete users[username];
                    app.set('users', users);
                    break;
                }
            }
        });

        const checkStatus = async () => {
            for (let username in users) {
                const result = await gameService.getGamesByUsername(username);
                const { games } = result;
                for (let i = 0; i < games.length; i++) {
                    const user = username === games[i].p1.username ? games[i].p2?.username : games[i].p1.username;
                    const opponentSocketId = users[user];
                    const currentSocketId = users[username];
                    if (currentSocketId) {
                        io.to(currentSocketId).emit('PlayerConnected', { user, availability: !!opponentSocketId });
                    }
                }
            }
        };
        const intervalId = setInterval(checkStatus, 5000);
    });
}
