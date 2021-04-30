var express = require('express');
var router = express.Router();
var homeLayout = './layouts/home-layout';

var User = require('../models/user');
var Hashtag = require('../models/hashtag');
const { hash } = require('bcrypt');
var followList;
var hashtagList;
var hashtagList;
var userStats;

router.get('/:text', isLoggedIn, async function (req, res, next) {
    const users = await User.find();

    //Determine follow list
    followList = loadFollowList(req, res, users);
    hashtagList = await loadHashtagList();

    //Save followList to session variable
    res.locals.followList = followList;
    res.locals.hashtagList = hashtagList;

    const hashtag = await Hashtag.findOne({ text: req.params.text })
        .populate({
            path: 'posts',
            populate: {
                path: 'comments',
                populate: {
                    path: 'user',
                    model: 'User'
                }
            }
        })
        .populate({
            path: 'posts',
            populate: {
                path: 'user',
                model: 'User'
            }
        })
        .exec();

    var postCount = req.user.posts.length;
    var followingCount = req.user.following.length;
    var followerCount = req.user.follower.length;
    userStats = [postCount, followingCount, followerCount];

    var feedContent, feedResults = [], comments = [];
    if (hashtag != null) {
        //Load hashtag posts
        for (var i = 0; i < hashtag.posts.length; ++i) {
            comments = [];
            var post = hashtag.posts[i];
            var postHasComments = post.comments.length > 0;
            if (postHasComments) {
                var postComments = post.comments;
                for (var j = 0; j < postComments.length; ++j) {
                    var comment = postComments[j];
                    var commentContent = {
                        postId: comment._id,
                        parentId: post._id,
                        name: comment.user.firstName + " " + comment.user.lastName,
                        username: comment.user.username,
                        canDelete: (comment.user.username == req.user.username),
                        isLiked: isLike(req.user, comment),
                        likeCount: comment.likes.length,
                        post: comment.post,
                        date: comment.date,
                        timeElapse: calculateTimePassed(comment.date)
                    }
                    comments.push(commentContent);
                }
            }
            
            var postUser = hashtag.posts[i].user;
            feedContent = {
                postId: post._id,
                name: postUser.firstName + " " + postUser.lastName,
                username: postUser.username,
                canDelete: (postUser.username == req.user.username),
                isLiked: isLike(req.user, post),
                likeCount: post.likes.length,
                post: post.post,
                date: post.date,
                timeElapse: calculateTimePassed(post.date),
                comments: comments
            };
            feedResults.push(feedContent);
        }
        const sortedfeedResults = feedResults.sort((a, b) => b.date - a.date);

        res.render('hashtag/hashtag.ejs', {
            layout: homeLayout,
            user: req.user,
            feedResults: sortedfeedResults,
            userStats: userStats,
            title: req.params.text
        });
    } else {
        res.render('hashtag/hashtag.ejs', {
            layout: homeLayout,
            user: req.user,
            feedResults: [],
            userStats: userStats,
            title: req.params.text
        });
    }

});

function isLike(loginUser, post) {
    var userLikedPost;

    //Check if user already like this post
    for (var i = 0; i < post.likes.length; ++i) {
        userLikedPost = (post.likes[i].toString() == loginUser._id.toString());
        if (userLikedPost) {
            return true;
        }
    }
    return false;
}

function calculateTimePassed(timestamp) {
    var currentTime = Date.now();
    var timePassed = currentTime - timestamp;

    const oneSecond = 1000;
    const oneMinute = 60 * oneSecond;
    const oneHour = 60 * oneMinute;
    const oneDay = 24 * oneHour;

    var days = Math.floor(timePassed / oneDay);
    if (days > 0) {
        return (days + "d");
    }
    var hours = Math.floor(timePassed / oneHour);
    if (hours > 0) {
        return (hours + "h");
    }
    var minutes = Math.floor(timePassed / oneMinute);
    if (minutes > 0) {
        return (minutes + "m");
    }
    var seconds = Math.floor(timePassed / oneSecond);
    if (seconds > 0) {
        return (seconds + "s");
    }
    return ("0s");
}

function loadFollowList(req, res, users) {
    //Load all the userID that person is following
    var followList = [];
    var personProfile, isFollow;
    for (var i = 0; i < users.length; ++i) {
        if (users[i]._id.toString() != req.user._id.toString()) {
            isFollow = isFollowed(req.user, users[i]);
            personProfile = {
                name: users[i].firstName + " " + users[i].lastName,
                username: users[i].username,
                followed: isFollow,
                link: followRoute(isFollow, users[i]._id)
            }
            followList.push(personProfile);
        }
    }
    return followList;
}

async function loadHashtagList() {
    //Load all the userID that person is following
    var hashtagList = [];
    var hashtag;
    var hashtags = await Hashtag.find();

    for (var i = 0; i < hashtags.length; ++i) {
        hashtag = {
            text: hashtags[i].text,
            link: "/hashtag/" + hashtags[i].text,
            count: hashtags[i].posts.length
        }
        hashtagList.push(hashtag);

    }
    return hashtagList;
}

function isFollowed(loginUser, user) {
    //Load all the userID that person is following
    const userFollowing = loginUser.following;
    var isFollowed = false;
    if (userFollowing != null) {
        for (var i = 0; i < userFollowing.length; ++i) {
            if (userFollowing[i]._id.toString() == user._id.toString()) {
                isFollowed = true;
            }
        }
    }
    return isFollowed;
}

function followRoute(isFollowed, userId) {
    if (isFollowed) {
        return ('home/unfollow/' + userId);
    }
    return ('home/follow/' + userId);
}

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}


module.exports = router;