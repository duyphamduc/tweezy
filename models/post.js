const mongoose = require("mongoose");
var Schema = mongoose.Schema;

var postSchema = new Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    parent: {type: mongoose.Schema.Types.ObjectId, ref: 'Post'},
    post: {type: String, require: true},
    likes: [
        {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
    ],
    comments: [
        {type: mongoose.Schema.Types.ObjectId, ref: 'Post'}
    ],
    date: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Post", postSchema);