const express = require("express")
const cors = require('cors')
const db = require("./src/configs/db")
const cookieParser = require("cookie-parser")
var socketIo = require('socket.io');


const PORT = process.env.PORT
const app = express()
app.use(express.json())
app.use(cors())

db()

const usersRouter = require('./src/routes/users.route')
const gameRouter = require('./src/routes/games.route')

app.use(cookieParser());
app.use('/users', usersRouter)
app.use('/games', gameRouter)

const server = app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))

const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
app.set('io', io);

const users = {};
app.set('users', users);

io.on('connection', (socket) => {
    socket.on('register', (username) => {
        if (typeof username === 'string') {
            users[username] = socket.id;
            app.set('users', users);
        } else {
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
});
