const express = require("express")
const cors = require('cors')
const db = require("./src/configs/db")
const cookieParser = require("cookie-parser")
const socketSetup = require('./src/sockets/socket');

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

socketSetup(server, app);
