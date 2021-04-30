const mongoose = require("mongoose");
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

var userSchema = new Schema({
    firstName: {type: String, require: true},
    lastName: {type: String, require: true},
    dateOfBirth: {type: Date, require: true},
    username: {type: String, require: true},
    email: {type: String, require: true},
    password: {type: String, require: true},
    securityQuestion: {type: String, require: true},
    securityAnswer: {type: String, require: true},
    gender: {type: String, require: true},
    location: {type: String, require: true},
    bio: {type: String, require: true},
    posts: [
        {type: mongoose.Schema.Types.ObjectId, ref: 'Post'}
    ],
    mentions: [
        {type: mongoose.Schema.Types.ObjectId, ref: 'Post'}
    ],
    following: [
        {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
    ],
    follower: [
        {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
    ],
    notifications: [
        {type: mongoose.Schema.Types.ObjectId, ref: 'Post'}
    ]
});

userSchema.methods.encryptPassword = function (password) {
    return bcrypt.hashSync(password, 10);
}

userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password); // true
};

module.exports = mongoose.model("User", userSchema);