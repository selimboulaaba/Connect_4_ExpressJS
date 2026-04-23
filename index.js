const express = require("express")
const cors = require('cors')
const db = require("./src/configs/db")
const cookieParser = require("cookie-parser")
const socketSetup = require('./src/sockets/socket');

const dotenv = require('dotenv')
dotenv.config()

const PORT = process.env.PORT || 3000;
const app = express()
app.use(express.json())
app.use(cors({ origin: process.env.FRONT_URL, credentials: true }))

db()

const usersRouter = require('./src/routes/users.route')
const gameRouter = require('./src/routes/games.route')
const puzzlesRouter = require('./src/routes/puzzles.route')
const tournamentsRouter = require('./src/routes/tournaments.route')

app.use(cookieParser());
app.use('/users', usersRouter)
app.use('/games', gameRouter)
app.use('/puzzles', puzzlesRouter)
app.use('/tournaments', tournamentsRouter)

const server = app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))

socketSetup(server, app);
