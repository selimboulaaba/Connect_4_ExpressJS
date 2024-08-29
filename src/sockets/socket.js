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
            const user = await userService.getUserById(inviteData.newGame.p1)
            const user2 = await userService.getUserById(inviteData.newGame.p2)
            const recipientSocketId = users[user.user.username];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('inviteDeclined', { username: user2.user.username });
            } else {
                console.log('User not found');
            }
        });

        socket.on('disconnect', () => {
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
                    const socketId = users[user];
                    if (socketId) {
                        io.to(socketId).emit('PlayerConnected', { user, availability: true });
                    } else {
                        io.to(socketId).emit('PlayerConnected', { user, availability: false });
                    }
                }
            }
        };
        const intervalId = setInterval(checkStatus, 5000);
    });
}
