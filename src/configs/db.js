const mongoose = require("mongoose")
const dns = require("dns")

// Some networks can't resolve Atlas SRV records with their default DNS.
dns.setServers(["1.1.1.1", "8.8.8.8"])

// MONGO_URI overrides the default Atlas cluster (handy for local development).
const uri = () => process.env.MONGO_URI ||
    'mongodb+srv://' + process.env.MONGO_USER + ':' + process.env.MONGO_PASSWORD +
    '@personalapps.8f3hh.mongodb.net/connect_4?retryWrites=true&w=majority&appName=PersonalApps'

// Keeps retrying so a cold start during an Atlas hiccup doesn't leave the API without a database.
const db = async () => {
    for (let attempt = 1; ; attempt++) {
        try {
            await mongoose.connect(uri(), { serverSelectionTimeoutMS: 10000 })
            console.log("Connected to MongoDB")
            return
        } catch (error) {
            console.error(`MongoDB connection error (attempt ${attempt}):`, error.message)
            await new Promise((resolve) => setTimeout(resolve, Math.min(30000, attempt * 5000)))
        }
    }
}

module.exports = db
