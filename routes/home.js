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
var notifications;

router.get('/', isLoggedIn, async function (req, res, next) {

    //Get entire User DB
    const users = await User.find();

    //Determine follow list
    followList = loadFollowList(req, res, users);
    hashtagList = await loadHashtagList();

    //Save followList to session variable
    res.locals.followList = followList;
    res.locals.hashtagList = hashtagList;

    var feedResults;
    var selfPosts = await loadSelfPost(req);
    var followingPosts = await loadFollowingPost(req);
    var mentionPosts = await loadMentionPost(req);
    feedResults = selfPosts.concat(followingPosts).concat(mentionPosts);

    const loginUser = await User.findOne({ username: req.user.username })

    var postCount = loginUser.posts.length;
    var followingCount = loginUser.following.length;
    var followerCount = loginUser.follower.length;
    notifications = loginUser.notifications.length;

    userStats = [postCount, followingCount, followerCount];
    res.locals.userStats = userStats;

    const sortedfeedResults = feedResults.sort((a, b) => b.date - a.date)
    res.render('home/feed.ejs', {
        layout: homeLayout,
        user: req.user,
        feedResults: sortedfeedResults,
        messages: req.flash('messages')
    });

});

router.get('/self', isLoggedIn, async function (req, res, next) {
    res.locals.followList = followList;
    res.locals.userStats = userStats;
    res.locals.hashtagList = hashtagList;
    res.locals.notifications = notifications;

    var feedResults = await loadSelfPost(req);

    if(feedResults != null){
        const sortedfeedResults = feedResults.sort((a, b) => b.date - a.date)
        res.render('home/feed.ejs', {
            layout: homeLayout,
            user: req.user,
            feedResults: sortedfeedResults
        });
    }else{
        res.render('home/feed.ejs', {
            layout: homeLayout,
            user: req.user,
            feedResults: []
        });
    }
});

router.get('/notification', isLoggedIn, async function (req, res, next) {
    res.locals.followList = followList;
    res.locals.userStats = userStats;
    res.locals.hashtagList = hashtagList;

    const loginUser = await User.findOne({ username: req.user.username })
    notifications = loginUser.notifications.length;
    res.locals.notifications = notifications;

    var feedResults = await loadNotificationPost(req);
    if(feedResults != null){
        const sortedfeedResults = feedResults.sort((a, b) => b.date - a.date)
        res.render('home/notification.ejs', {
            layout: homeLayout,
            user: req.user,
            feedResults: sortedfeedResults
        });
    }else{
        res.render('home/notification.ejs', {
            layout: homeLayout,
            user: req.user,
            feedResults: []
        });
    }
});
router.get('/notification/delete/:id', isLoggedIn, async function (req, res, next) {
    res.locals.followList = followList;
    res.locals.userStats = userStats;
    res.locals.hashtagList = hashtagList;
    res.locals.notifications = notifications;

    const post = await Post.findById(req.params.id);

    const loginUser = await User.findOne({ username: req.user.username });
    
    //Delete the notification
    for (var i = 0; i < loginUser.notifications.length; i++) {
        if (loginUser.notifications[i].toString() == req.params.id) {
            loginUser.notifications.splice(i, 1);
        }
    }
    await loginUser.save();

    res.redirect('back');
});

router.post('/account/delete', isLoggedIn, async function (req, res, next) {
    if (req.body.username != req.user.username) {
        req.flash('messages', 'Incorrect username. Delete Fail');
        res.redirect('/home/profile');
        return;
    }else{
        //Delete all post associate with this user
        await Post.deleteMany({user: req.user._id});

        //Delete this account
        await User.findOneAndDelete({username: req.body.username});
        res.redirect('/logout');
    }
});

async function loadSelfPost(req) {
    const user = await User.findOne({ username: req.user.username })
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
        .exec();

    var feedContent, feedResults = [], comments = [];
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
            canDelete: true,
            isLiked: isLike(req.user, user.posts[i]),
            likeCount: post.likes.length,
            post: post.post,
            date: post.date,
            timeElapse: calculateTimePassed(post.date),
            comments: comments
        };
        feedResults.push(feedContent);
    }
    return feedResults;
}

async function loadFollowingPost(req){
    const user = await User.findOne({ username: req.user.username })
        .populate({
            path: 'following',
            populate: {
                path: 'posts',
                populate: {
                    path: 'comments',
                    populate: {
                        path: 'user',
                        model: 'User'
                    }
                }
            }
        })
    var feedContent, feedResults = [];
    //Load following posts
    var followingUsers = user.following;
    for (var i = 0; i < followingUsers.length; ++i) {
        var followingUser = followingUsers[i];
        for (var j = 0; j < followingUser.posts.length; ++j) {
            var followingUserPost = followingUser.posts[j];
            var postHasComments = followingUserPost.comments.length > 0;
            var comments = [];
            if (postHasComments) {
                var postComments = followingUserPost.comments;
                for (var k = 0; k < postComments.length; ++k) {
                    var comment = postComments[k];
                    var commentContent = {
                        postId: comment._id,
                        parentId: followingUserPost._id,
                        name: comment.user.firstName + " " + comment.user.lastName,
                        username: comment.user.username,
                        canDelete: (comment.user.username == user.username),
                        isLiked: isLike(req.user, postComments[k]),
                        likeCount: comment.likes.length,
                        post: comment.post,
                        date: comment.date,
                        timeElapse: calculateTimePassed(comment.date)
                    }
                    comments.push(commentContent);
                }
            }
            feedContent = {
                postId: followingUserPost._id,
                name: followingUser.firstName + " " + followingUser.lastName,
                username: followingUser.username,
                canDelete: false,
                isLiked: isLike(req.user, followingUserPost),
                likeCount: followingUserPost.likes.length,
                post: followingUserPost.post,
                date: followingUserPost.date,
                timeElapse: calculateTimePassed(followingUserPost.date),
                comments: comments
            };
            feedResults.push(feedContent);
        }
    }
    return feedResults;
}

async function loadMentionPost(req){
    const user = await User.findOne({ username: req.user.username })
    .populate({
        path: 'mentions',
        populate: {
            path: 'comments',
            populate: {
                path: 'user',
                model: 'User'
            }
        }
    })
    .populate({
        path: 'mentions',
        populate: {
            path: 'user',
            model: 'User'
        }
    })
    .exec();

    var feedContent, feedResults = [], comments = [];
    //Load self posts
    for (var i = 0; i < user.mentions.length; ++i) {
        comments = [];
        var post = user.mentions[i];
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
        
        var mentionUser = user.mentions[i].user;
        feedContent = {
            postId: post._id,
            name: mentionUser.firstName + " " + mentionUser.lastName,
            username: mentionUser.username,
            canDelete: false,
            isLiked: isLike(req.user, post),
            likeCount: post.likes.length,
            post: post.post,
            date: post.date,
            timeElapse: calculateTimePassed(post.date),
            comments: comments
        };
        feedResults.push(feedContent);
    }
    return feedResults;
}

async function loadNotificationPost(req) {
    const user = await User.findOne({ username: req.user.username })
        .populate({
            path: 'notifications',
            populate: {
                path: 'comments',
                populate: {
                    path: 'user',
                    model: 'User'
                }
            }
        })
        .populate({
            path: 'notifications',
            populate: {
                path: 'user',
                model: 'User'
            }
        })
        .exec();

    var feedContent, feedResults = [], comments = [];
    //Load self posts
    for (var i = 0; i < user.notifications.length; ++i) {
        comments = [];
        var post = user.notifications[i];
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
        
        var nofitificationUser = user.notifications[i].user
        feedContent = {
            postId: post._id,
            name: nofitificationUser.firstName + " " + nofitificationUser.lastName,
            username: nofitificationUser.username,
            canDelete: false,
            isLiked: isLike(req.user, post),
            likeCount: post.likes.length,
            post: post.post,
            date: post.date,
            timeElapse: calculateTimePassed(post.date),
            comments: comments
        };
        feedResults.push(feedContent);
    }
    return feedResults;
}

router.get('/follow/:id', isLoggedIn, async function (req, res, next) {
    const followUser = await User.findById(req.params.id);
    const loginUser = await User.findOne({ username: req.user.username });

    loginUser.following.push(followUser);
    await loginUser.save();
    followUser.follower.push(loginUser);
    await followUser.save();
    res.redirect('/home');
});

router.get('/unfollow/:id', isLoggedIn, async function (req, res, next) {
    const followUser = await User.findById(req.params.id);
    const loginUser = await User.findOne({ username: req.user.username });

    //Delete user from Following list
    for (var i = 0; i < loginUser.following.length; i++) {
        if (loginUser.following[i]._id.toString() == followUser._id.toString()) {
            loginUser.following.splice(i, 1);
        }
    }
    await loginUser.save();

    //Delete user from Follower list
    for (var i = 0; i < followUser.follower.length; i++) {
        if (followUser.follower[i]._id.toString() == loginUser._id.toString()) {
            followUser.follower.splice(i, 1);
        }
    }
    await followUser.save();
    res.redirect('/home');
});

router.get('/profile', isLoggedIn, function (req, res, next) {
    res.locals.userStats = userStats;
    res.locals.followList = followList;
    res.locals.hashtagList = hashtagList;
    res.locals.notifications = notifications;

    res.render('home/profile.ejs', {
        layout: homeLayout,
        user: req.user,
        messages: req.flash('messages')
    });
});

router.post('/profile/update', isLoggedIn, async function (req, res, next) {
    res.locals.userStats = userStats;
    res.locals.followList = followList;
    res.locals.hashtagList = hashtagList;
    res.locals.notifications = notifications;

    const updateUser = await User.updateOne(
        { username: req.user.username },
        {
            $set: {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                dateOfBirth: req.body.dateOfBirth,
                location: req.body.location,
                gender: req.body.gender,
                bio: req.body.bio
            }
        });

    req.flash('messages', 'Your profile been updated!!');
    res.redirect('/home/profile');
});

router.post('/profile/changePassword', isLoggedIn, async function (req, res, next) {
    var user = await User.findOne({ username: req.user.username });

    //Check old password entered is correct
    if (!user.validPassword(req.body.oldpassword)) {
        req.flash('messages', 'Old password you enter is incorrect');
        res.redirect('/home/profile');
        return;
    }

    //Check password and confirm password matched
    if (req.body.password != req.body.confirmPassword) {
        req.flash('messages', 'Confirm password does not match');
        res.redirect('/home/profile');
        return;
    }

    //Check passowrd length
    if (req.body.password.length < 3) {
        req.flash('messages', 'New password you enter is too short');
        res.redirect('/home/profile');
        return;
    }

    //Update password
    const updateUser = await User.updateOne(
        { username: req.user.username },
        {
            $set: {
                password: user.encryptPassword(req.body.password)
            }
        });

    req.flash('messages', 'Your password has been changed!!');
    res.redirect('/home/profile');

});

router.get('/following', isLoggedIn, async function (req, res, next) {
    res.locals.followList = followList;
    res.locals.userStats = userStats;
    res.locals.hashtagList = hashtagList;
    res.locals.notifications = notifications;

    var peopleProfile = [];
    var personProfile;
    const result = await User.findOne({ username: req.user.username })
        .populate('following')
        .exec();

    //Load people list that user follow
    var followingList = result.following;
    for (var i = 0; i < followingList.length; ++i) {
        personProfile = {
            name: followingList[i].firstName + " " + followingList[i].lastName,
            username: followingList[i].username,
            followed: true,
            link: 'home/unfollow/' + followingList[i]._id
        };
        peopleProfile.push(personProfile);
    }

    res.render('home/people.ejs', {
        title: "My following",
        layout: homeLayout,
        user: req.user,
        people: peopleProfile
    });
});

router.get('/follower', isLoggedIn, async function (req, res, next) {
    res.locals.followList = followList;
    res.locals.userStats = userStats;
    res.locals.hashtagList = hashtagList;
    res.locals.notifications = notifications;

    var peopleProfile = [];
    var personProfile;
    const result = await User.findOne({ username: req.user.username })
        .populate('follower')
        .exec();

    //Load people list follow this user
    var followerList = result.follower;
    var isFollow;
    for (var i = 0; i < followerList.length; ++i) {
        isFollow = isFollowed(req.user, followerList[i]);
        personProfile = {
            name: followerList[i].firstName + " " + followerList[i].lastName,
            username: followerList[i].username,
            followed: isFollow,
            link: followRoute(isFollow, followerList[i]._id)
        };
        peopleProfile.push(personProfile);
    }

    res.render('home/people.ejs', {
        title: "My follower",
        layout: homeLayout,
        user: req.user,
        people: peopleProfile
    });
});

router.get('/people', isLoggedIn, function (req, res, next) {
    res.locals.followList = followList;
    res.locals.hashtagList = hashtagList;
    res.locals.notifications = notifications;

    var result = req.user;

    var postCount = result.posts.length;
    var followingCount = result.following.length;
    var followerCount = result.follower.length;
    userStats = [postCount, followingCount, followerCount];
    res.locals.userStats = userStats;

    var people = followList;
    res.render('home/people.ejs', {
        title: "People",
        layout: homeLayout,
        user: req.user,
        people: people
    });
});

router.get('/hashtag', isLoggedIn, function (req, res, next) {
    res.locals.followList = followList;
    res.locals.hashtagList = hashtagList;
    res.locals.notifications = notifications;

    var result = req.user;

    var postCount = result.posts.length;
    var followingCount = result.following.length;
    var followerCount = result.follower.length;
    userStats = [postCount, followingCount, followerCount];
    res.locals.userStats = userStats;

    var people = followList;
    res.render('home/hashtag.ejs', {
        title: "#Trends",
        layout: homeLayout,
        user: req.user,
        people: people
    });
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