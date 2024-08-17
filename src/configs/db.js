const mongoose = require("mongoose")
const dotenv = require("dotenv")
dotenv.config()

const db = async () =>{
    try {
        await mongoose.connect(
            'mongodb+srv://' + process.env.MONGO_USER + ':' + process.env.MONGO_PASSWORD + '@connect-4.8f3hh.mongodb.net/App?retryWrites=true&w=majority&appName=Connect-4'
          );
        console.log("Connected to MongoDB")
    } catch (error) {
        console.log('MongoDB connection error:', error)
    }
} 

module.exports = db