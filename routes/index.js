var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');

var User = require('../models/user');

var csrfProtection = csrf();

var allowChangePassword = false;
var username;

// Router
router.get('/', notLoggedIn, function (req, res, next) {
    res.render('index/banner.ejs');
});

router.get('/iforgot', notLoggedIn, csrfProtection, function (req, res, next) {
    var messages = req.flash('error');
    res.render('index/iforgot.ejs', {
        csrfToken: req.csrfToken(),
        messages: messages, hasErrors: messages.length > 0
    });
});

router.post('/iforgot', notLoggedIn, async function (req, res, next) {
    const user = await User.findOne({ username: req.body.username });
    
    if (user != null) {
        username = user.username;
        if (user.securityQuestion == req.body.questions && user.securityAnswer == req.body.answer.toLowerCase()) {
            //Change password
            allowChangePassword = true;
            res.redirect('/changePassword');
        } else {
            req.flash('error', 'Information you enter is incorrect.');
            res.redirect('/iforgot');
        }
    } else {
        req.flash('error', 'User does not exist');
        res.redirect('/iforgot');
    }
});

router.get('/changePassword', function (req, res, next) {
    if (allowChangePassword) {
        var messages = req.flash('error');
        res.render('index/changePassword.ejs', {
            messages: messages, hasErrors: messages.length > 0
        });
    } else {
        res.redirect('/iforgot');
    }
});

router.post('/changePassword', async function (req, res, next) {
    if (allowChangePassword) {
        var user = await User.findOne({ username: username });
        
        //Check password and confirm password matched
        if (req.body.password != req.body.confirmPassword) {
            req.flash('error', 'Confirm password does not match');
            res.redirect('/changePassword');
            return;
        }

        //Check passowrd length
        if (req.body.password.length < 3) {
            req.flash('error', 'New password you enter is too short');
            res.redirect('/changePassword');
            return;
        }

        //Update password
        const updateUser = await User.updateOne(
            { username: username },
            {
                $set: {
                    password: user.encryptPassword(req.body.password)
                }
            });
        res.redirect('/login');
    } else {
        res.redirect('/iforgot')
    }
});

router.get('/login', notLoggedIn, csrfProtection, function (req, res, next) {
    var messages = req.flash('error');
    res.render('index/login.ejs', {
        csrfToken: req.csrfToken(),
        messages: messages, hasErrors: messages.length > 0
    });
});

router.post('/login', passport.authenticate('local.signin', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
}));

router.get('/signup', notLoggedIn, csrfProtection, function (req, res, next) {
    var messages = req.flash('error');
    res.render('index/signup.ejs', {
        csrfToken: req.csrfToken(),
        messages: messages, hasErrors: messages.length > 0
    });
});

router.post('/signup', passport.authenticate('local.signup', {
    successRedirect: '/home',
    failureRedirect: '/signup',
    failureFlash: true
}));

router.get('/logout', isLoggedIn, function (req, res, next) {
    req.logout();
    res.redirect('/');
});

module.exports = router;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/home');
}

function notLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/home');
}