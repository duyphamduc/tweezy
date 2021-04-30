var express = require('express');
var router = express.Router();
var userLayout = './layouts/user-layout';

var User = require('../models/user');
var Hashtag = require('../models/hashtag');
var personFollowList;
var personFollowerList;
var hashtagList;
var userStats;

router.get('/:username', isLoggedIn, async function (req, res, next) {
    //Fetching user data
    var feedResults = [];
    var feedContent;
    if (req.user.username != req.params.username) {
        const user = await User.findOne({ username: req.params.username })
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
            .populate('following')
            .populate('follower')
            .exec();
    

        if (user != null) {
            personFollowList = loadFollowList(user.following);
            personFollowerList = loadFollowList(user.follower);
            hashtagList = await loadHashtagList();
            res.locals.hashtagList = hashtagList;

            //Follow/Unfollow button
            const loginUserFollowing = req.user.following;
            var isFollowed = false;
            var followURL = '/home/follow/' + user._id.toString();
            if (loginUserFollowing != null) {
                for (var i = 0; i < loginUserFollowing.length; ++i) {
                    if (loginUserFollowing[i]._id.toString() == user._id.toString()) {
                        isFollowed = true;
                        followURL = '/home/unfollow/' + user._id.toString();
                    }
                }
            }

            //Load self posts
            for (var i = 0; i < user.posts.length; ++i) {
                comments = [];
                var post = user.posts[i];
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

                feedContent = {
                    postId: post._id,
                    name: user.firstName + " " + user.lastName,
                    username: user.username,
                    canDelete: false,
                    isLiked: isLike(req.user, user.posts[i]),
                    likeCount: post.likes.length,
                    post: post.post,
                    date: post.date,
                    timeElapse: calculateTimePassed(post.date),
                    comments: comments
                };
                feedResults.push(feedContent);
            }

            const sortedfeedResults = feedResults.sort((a, b) => b.date - a.date)

            var postCount = user.posts.length;
            var followingCount = user.following.length;
            var followerCount = user.follower.length;
            userStats = [postCount, followingCount, followerCount];

            res.render('user/user.ejs', {
                layout: userLayout,
                user: user,
                feedResults: sortedfeedResults,
                personFollowList: personFollowList,
                personFollowerList: personFollowerList,
                isFollowed: isFollowed,
                followURL: followURL,
                userStats: userStats
            });
        } else {
            res.render('user/user-error.ejs', {
                layout: userLayout,
                user: null
            });
        }
    }
    else {
        res.redirect('/home');
    }
});


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

function loadFollowList(peopleList) {
    //Load all the userID that person is following
    var followList = [];
    var personProfile;
    for (var i = 0; i < peopleList.length; ++i) {
        personProfile = {
            name: peopleList[i].firstName + " " + peopleList[i].lastName,
            username: peopleList[i].username,
        }
        followList.push(personProfile);
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

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}


module.exports = router;