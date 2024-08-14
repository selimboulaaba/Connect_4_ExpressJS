const userModel = require('../entities/user')
const bcrypt = require('bcrypt')

exports.signup = async (newUser) => {
    newUser.password = await bcrypt.hash(newUser.password, 12)
    const user = await userModel.create(newUser)
    return {
        user
    }
}

exports.signin = async (User) => {
    const user = await userModel.findOne({ username: User.username });
    if (!user) {
        throw new Error('Wrong Username.');
    }
    const isPasswordCorrect = await bcrypt.compare(User.password, user.password);
    if (!isPasswordCorrect) {
        throw new Error('Wrong Password.');
    }
    return { user };
};

exports.getUser = async (id) => {
    const user = await userModel.findById(id)
    return {
        user
    }
}