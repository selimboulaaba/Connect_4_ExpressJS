// FRONT_URL may list several origins separated by commas,
// e.g. "https://connect-4-jade.vercel.app,http://localhost:5173".
const allowedOrigins = (process.env.FRONT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)

module.exports = { allowedOrigins }
