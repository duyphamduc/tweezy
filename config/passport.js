var passport = require('passport');
var User = require('../models/user');
var localStrategy = require('passport-local').Strategy;

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    })
});

passport.use('local.signup', new localStrategy(
    {usernameField: 'email', passwordField: 'password', passReqToCallback: true},
    function(req, email, password, done) {
        req.checkBody('email', 'Invalid email').notEmpty().isEmail().notEmpty();
        req.checkBody('password', 'Password was too short!').notEmpty().isLength({min:3});
        req.checkBody('firstName', 'First name cannot be blank').notEmpty();
        req.checkBody('lastName', 'Last name cannot be blank').notEmpty();
        req.checkBody('dateOfBirth', 'Date of birth cannot be blank').notEmpty();
        req.checkBody('username', 'Username cannot be blank').notEmpty();
        req.checkBody('confPassword', 'Confirm password cannot be blank').notEmpty();
        req.checkBody('answer', 'Answer cannot be blank').notEmpty();
        var errors = req.validationErrors();
        
        if(errors){
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return done(null, false, req.flash('error', messages));
        }
        User.findOne({'email': email}, function (err, user) {
            if(err){
                return done(err);
            }
            if(user){
                return done(null, false, {message: 'Email is already in use.'});
            }
            var newUser = new User();
            newUser.firstName = req.body.firstName;
            newUser.lastName = req.body.lastName;
            newUser.dateOfBirth = req.body.dateOfBirth;
            newUser.username = req.body.username;
            newUser.email = email;
            newUser.password = newUser.encryptPassword(password);
            newUser.securityQuestion = req.body.questions;
            newUser.securityAnswer = (req.body.answer).toLowerCase();
            newUser.gender = req.body.gender;
            newUser.location = req.body.location;
            newUser.bio = req.body.bio;
            newUser.save(function (err, result) {
                if (err) {
                    return done(err);
                }
                return done(null, newUser);
            })
        });
    }
));

passport.use('local.signin', new localStrategy(
    { usernameField: 'username', passwordField: 'password', passReqToCallback: true },
    function (req, username, password, done) {
        req.checkBody('username', 'Username cannot be empty').notEmpty();
        req.checkBody('password', 'Password was too short!').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return done(null, false, req.flash('error', messages));
        }
        User.findOne({ 'username': username }, function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, { message: 'No user found.' });
            }
            if (!user.validPassword(password)) {
                return done(null, false, { message: 'Wrong password.' });
            }
            return done(null, user);
        });
    }
));
