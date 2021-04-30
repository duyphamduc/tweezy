var express = require('express');
var router = express.Router();
var homeLayout = './layouts/home-layout';

var Post = require('../models/post');
var User = require('../models/user');
var Hashtag = require('../models/hashtag');
const flash = require('connect-flash');
var followList;
var hashtagList;
var userStats;

router.post('/post', isLoggedIn, async function (req, res, next) {
    const loginUser = await User.findOne({ username: req.user.username });

    if(req.body.post.length > 280){
        req.flash('messages', 'Your post is too long. Maximum is 280 characters.');
        res.redirect('/home');
    }else{
        //Save new post to post's database
        var newPost = new Post({
            user: loginUser._id,
            parent: null,
            post: req.body.post
        });
        await newPost.save();
    
        //Update newPost reference to this user
        loginUser.posts.push(newPost);
        await loginUser.save();
    
        //Update mention DB bases on content of the post
        await addPostToMentionDB(newPost, isComment = false);
    
        //Update hashtag DB bases on content of the post
        await addPostToHashtagDB(newPost, isComment = false);
    
        res.redirect('/home');
    }

});


router.get('/delete/:id', isLoggedIn, async function (req, res, next) {
    //Find this post
    const post = await Post.findById(req.params.id);

    //Delete post from mention DB
    var mentionList = postFilter('@', post.post);
    if (mentionList != 0) {
        for (var i = 0; i < mentionList.length; ++i) {
            var user = await User.findOne({ username: mentionList[i] });

            if(user != null){
                for (var i = 0; i < user.mentions.length; i++) {
                    if (user.mentions[i].toString() == req.params.id) {
                        user.mentions.splice(i, 1);
                        break;
                    }
                }
                await user.save();
            }
        }
    }

    //Delete post from hashtag DB
    var hashtagList = postFilter('#', post.post);
    if (hashtagList != 0) {
        for (var i = 0; i < hashtagList.length; ++i) {
            var hashtag = await Hashtag.findOne({ text: hashtagList[i] });

            //Delete post under this hashtag
            for (var i = 0; i < hashtag.posts.length; i++) {
                if (hashtag.posts[i].toString() == req.params.id) {
                    hashtag.posts.splice(i, 1);
                    break;
                }
            }
            await hashtag.save();
        }

        //Clean up all hashtag with 0 post
        for (var i = 0; i < hashtagList.length; ++i) {
            var hashtag = await Hashtag.findOne({ text: hashtagList[i] });

            if (hashtag.posts.length == 0) {
                await Hashtag.deleteOne({ text: hashtagList[i] })
            }
        }
    }

    //Delete the post and unlink the post to user
    if (post.user.toString() == req.user._id) {
        //Delete post
        await Post.deleteOne({ _id: req.params.id });

        //get user DB
        const loginUser = await User.findOne({ username: req.user.username });

        //Remove post ref from this user
        for (var i = 0; i < loginUser.posts.length; i++) {
            if (loginUser.posts[i].toString() == req.params.id) {
                loginUser.posts.splice(i, 1);
            }
        }
        await loginUser.save();
    }

    res.redirect('back');
});

router.get('/like/:id', isLoggedIn, async function (req, res, next) {
    const post = await Post.findById(req.params.id);
    const loginUser = await User.findOne({ username: req.user.username });
    var userLikedPost;

    //Check if user already like this post
    for (var i = 0; i < post.likes.length; ++i) {
        userLikedPost = (post.likes[i].toString() == loginUser._id.toString());
        if (userLikedPost) {
            //Then unlike this post
            post.likes.splice(i, 1);
        }
    }

    //If user haven't like this post, then like it
    if (!userLikedPost) {
        post.likes.push(loginUser);
    }
    await post.save();

    res.redirect('back');
});

router.post('/comment/:id', isLoggedIn, async function (req, res, next) {
    const post = await Post.findById(req.params.id);

    if(req.body.post.length > 280){
        req.flash('messages', 'Your comment is too long. Maximum is 280 characters.');
        res.redirect('/home');
    }else{
        //Save new post to post's database
        var newPost = new Post({
            user: req.user._id,
            parent: post._id,
            post: req.body.post
        });
        await newPost.save();

        //Update newPost reference to this user
        post.comments.push(newPost);
        await post.save();

        //Update mention DB bases on content of the post
        await addPostToMentionDB(newPost, isComment = true);

        //Update hashtag DB bases on content of the post
        await addPostToHashtagDB(newPost, isComment = true);

        res.redirect('back');
    }
});

router.get('/comment/delete/', isLoggedIn, async function (req, res, next) {
    const parentPost = await Post.findById(req.query.parent);
    const commentPost = await Post.findById(req.query.comment);

    if (parentPost == null || commentPost == null) {
        res.redirect('/home');
        return;
    }

    if (commentPost.user._id.toString() == req.user._id.toString()) {
        //Delete post from mention DB
        var mentionList = postFilter('@', commentPost.post);
        if (mentionList != 0) {
            for (var i = 0; i < mentionList.length; ++i) {
                var user = await User.findOne({ username: mentionList[i] });

                if (user != null){
                    for (var i = 0; i < user.mentions.length; i++) {
                        if (user.mentions[i].toString() == parentPost._id.toString()) {
                            user.mentions.splice(i, 1);
                            break;
                        }
                    }
                    await user.save();
                }
            }
        }

        //Delete post from hashtag DB
        var hashtagList = postFilter('#', commentPost.post);
        if (hashtagList != 0) {
            for (var i = 0; i < hashtagList.length; ++i) {
                var hashtag = await Hashtag.findOne({ text: hashtagList[i] });

                //Delete post under this hashtag
                for (var i = 0; i < hashtag.posts.length; i++) {
                    if (hashtag.posts[i].toString() == parentPost._id.toString()) {
                        hashtag.posts.splice(i, 1);
                        break;
                    }
                }
                await hashtag.save();
            }

            //Clean up all hashtag with 0 post
            for (var i = 0; i < hashtagList.length; ++i) {
                var hashtag = await Hashtag.findOne({ text: hashtagList[i] });

                if (hashtag.posts.length == 0) {
                    await Hashtag.deleteOne({ text: hashtagList[i] })
                }
            }
        }

        //Loop through parent post and delete the comment
        for (var i = 0; i < parentPost.comments.length; ++i) {
            if (parentPost.comments[i].toString() == commentPost._id.toString()) {
                parentPost.comments.splice(i, 1);
            }
        }
        await parentPost.save();

        //delete the comment post
        await Post.findByIdAndDelete(req.query.comment);
    }

    res.redirect('back');
});

async function addPostToMentionDB(post, isComment) {
    //Find who been mention in the post the update their DB
    var mentionList = postFilter('@', post.post);
    if (mentionList.length != 0) {
        //Update mention DB
        for (var i = 0; i < mentionList.length; ++i) {
            var user = await User.findOne({ username: mentionList[i] });

            if(user != null){
                if (isComment) {
                    user.mentions.push(post.parent);
                    user.notifications.push(post.parent)
                } else {
                    user.mentions.push(post);
                    user.notifications.push(post);
                }
                await user.save();
            }
        }
    }
}

async function addPostToHashtagDB(post, isComment) {
    //Find all hashtag in the post and update DB
    var hashtagList = postFilter('#', post.post);
    if (hashtagList.length != 0) {
        for (var i = 0; i < hashtagList.length; ++i) {
            //Find if hash already exist
            var hashtag = await Hashtag.findOne({ text: hashtagList[i] })
            //If this hashtag not exist
            if (hashtag == null) {
                hashtag = new Hashtag({
                    text: hashtagList[i]
                });
            }
            if (isComment) {
                hashtag.posts.push(post.parent);
            } else {
                hashtag.posts.push(post);
            }
            await hashtag.save();
        }
    }
}

function postFilter(character, post) {
    var startIndex = 0, index;
    var textList = [];
    while ((index = post.indexOf(character, startIndex)) > -1) {
        indexOfSpace = post.indexOf(" ", index + 1);
        if (indexOfSpace == -1) {
            indexOfSpace = post.length;
        }
        var textSubstring = post.substring(index + 1, indexOfSpace);
        textList.push(textSubstring);
        startIndex = index + 1;
    }
    return textList;
}

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

module.exports = router;