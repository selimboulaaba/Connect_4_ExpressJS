require('dotenv').config()

const express = require('express')
const cors = require('cors')
const db = require('./src/configs/db')
const { allowedOrigins } = require('./src/configs/cors')
const socketSetup = require('./src/sockets/socket')
const scheduleCleanup = require('./src/jobs/cleanup')
const { errorHandler } = require('./src/utils/http')

if (!process.env.TOKEN_SECRET) {
    console.error('TOKEN_SECRET is not set. Add it to your environment variables.')
    process.exit(1)
}

const PORT = process.env.PORT || 3000
const app = express()

// Render (and most hosts) sit behind a proxy; needed for correct client IPs in rate limiting.
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(express.json({ limit: '20kb' }))
app.use(cors({ origin: allowedOrigins, credentials: true }))

// Lightweight endpoint for uptime pingers: no database access.
app.get('/health', (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }))

app.use('/users', require('./src/routes/users.route'))
app.use('/games', require('./src/routes/games.route'))
app.use('/puzzles', require('./src/routes/puzzles.route'))
app.use('/tournaments', require('./src/routes/tournaments.route'))

app.use((req, res) => res.status(404).json({ message: 'Not found.' }))
app.use(errorHandler)

db()
scheduleCleanup()

const server = app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))
socketSetup(server)

// Log instead of crashing the process on a stray promise.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err))
