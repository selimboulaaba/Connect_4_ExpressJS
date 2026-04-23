const mongoose = require("mongoose")
const dotenv = require("dotenv")
const dns = require("dns")
dotenv.config()

dns.setServers(["1.1.1.1"])

const db = async () =>{
    try {
        await mongoose.connect(
            'mongodb+srv://' + process.env.MONGO_USER + ':' + process.env.MONGO_PASSWORD + '@personalapps.8f3hh.mongodb.net/connect_4?retryWrites=true&w=majority&appName=PersonalApps'
          );
        console.log("Connected to MongoDB")
    } catch (error) {
        console.log('MongoDB connection error:', error)
    }
} 

module.exports = db