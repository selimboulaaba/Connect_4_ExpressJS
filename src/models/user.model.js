const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            require: true
        },
        password: {
            type: String,
            require: true
        },
        friends: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: [],
            }
        ],
        lvl: {
            type: Number,
            require: true,
            default: 1
        },
        xp: {
            type: Number,
            require: true,
            default: 0
        }
    },
    {
        new: true,
        timestamps: true
    }
)

module.exports = mongoose.model('User', userSchema)
