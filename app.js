var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var flash = require('express-flash');
var passport = require('passport');
var MongoStore = require('connect-mongo');
var layouts = require("express-ejs-layouts");
var validator = require('express-validator');
var cloudinary = require('cloudinary').v2;
if(process.env.NODE_ENV !== 'production'){
  require('dotenv').config();
}
require('./config/passport');


var app = express();
app.locals.moment = require('moment');

app.set('layout', './layouts/index-layout');
app.set("view engine", "ejs");
app.use(layouts);

//Connect to DB
mongoose.connect(process.env.DB, { 
  useNewUrlParser: true,
  useUnifiedTopology: true }, () => {
    console.log('connected to DB!')
  });

var indexRouter = require('./routes/index');
var homeRouter = require('./routes/home');
var postRouter = require('./routes/post');
var userRouter = require('./routes/user');
var hashtagRouter = require('./routes/hashtag');

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(validator());
app.use(cookieParser());
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DB}),
    cookie: { maxAge: 180 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    res.locals.login = req.isAuthenticated();
    res.locals.session = req.session;
    res.locals.followList;
    res.locals.hashtagList;
    res.locals.userStats;
    res.locals.notifications;
    next();
});

app.use('/', indexRouter);
app.use('/home', homeRouter);
app.use('/post', postRouter);
app.use('/user', userRouter);
app.use('/hashtag', hashtagRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
app.listen(process.env.PORT || 3000);
