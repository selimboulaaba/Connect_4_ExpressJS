const mongoose = require('mongoose')

class HttpError extends Error {
    constructor (status, message) {
        super(message)
        this.status = status
    }
}

// Forwards async errors to the Express error handler (Express 4 doesn't do it on its own).
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function assertObjectId (id, message = 'Invalid id.') {
    if (!mongoose.isValidObjectId(id)) throw new HttpError(400, message)
}

function errorHandler (err, req, res, next) {
    const status = err.status || (err.name === 'CastError' ? 400 : 500)
    if (status >= 500) console.error(err)
    res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again.' : err.message })
}

module.exports = { HttpError, asyncHandler, assertObjectId, errorHandler }
