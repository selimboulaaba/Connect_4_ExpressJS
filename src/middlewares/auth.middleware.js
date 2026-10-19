const jwt = require('jsonwebtoken')
const userModel = require('../models/user.model')

function signToken (user) {
    return jwt.sign({ id: String(user._id), username: user.username }, process.env.TOKEN_SECRET, { expiresIn: '7d' })
}

// Resolves a JWT to { id, username }. Older tokens only carry the username.
async function resolveToken (token) {
    if (!token) return null
    let payload
    try {
        payload = jwt.verify(token, process.env.TOKEN_SECRET)
    } catch {
        return null
    }
    const user = payload.id
        ? await userModel.findById(payload.id).select('username').lean()
        : await userModel.findOne({ username: payload.username }).select('username').lean()
    return user ? { id: String(user._id), username: user.username } : null
}

function bearer (req) {
    const header = req.headers.authorization || ''
    return header.startsWith('Bearer ') ? header.slice(7) : null
}

async function authenticateToken (req, res, next) {
    try {
        const user = await resolveToken(bearer(req))
        if (!user) return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
        req.user = user
        next()
    } catch (err) {
        next(err)
    }
}

// Like authenticateToken, but anonymous requests pass through with req.user = null.
async function optionalAuth (req, res, next) {
    try {
        req.user = await resolveToken(bearer(req))
        next()
    } catch (err) {
        next(err)
    }
}

module.exports = {
    authenticateToken,
    optionalAuth,
    resolveToken,
    signToken,
}
