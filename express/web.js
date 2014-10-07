var express = require('express');
var jade = require('jade');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var bodyParser = require('body-parser');
var url = require('url');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

//
// Environment variables:
// REDISCLOUD_URL = http://user:pwd@host:port
// GAPI_KEY = google client id
// GAPI_SECRET = google client secret
// GAPI_CB_URL = http://host:port/auth/google/cb
// PORT = port in CB URL above

function main() {
  var uri = url.parse(process.env.REDISCLOUD_URL || '');
  var store = process.env.REDISCLOUD_URL && new RedisStore({
    host: uri.hostname,
    port: +uri.port,
    ttl: 365*24*60*60,
    pass: uri.auth && uri.auth.split(':')[1]
  });

  var app = express();
  app.engine('jade', jade.__express);
  app.use(bodyParser.urlencoded())
  app.use(bodyParser.json())
  app.use(session({name: 'gn', secret: 'gonogo', store: store}));
  app.use('/res', express.static(__dirname + '/public'));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser(function (user, done) {
    if (!user) return done();
    return done(null, JSON.stringify(user));
  });

  passport.deserializeUser(function (data, done) { return done(null, JSON.parse(data)); });
  passport.use(new GoogleStrategy({
    clientID: process.env.GAPI_KEY, 
    clientSecret: process.env.GAPI_SECRET, 
    callbackURL: process.env.GAPI_CB_URL
  }, function (accessToken, refreshToken, profile, done) {
    return done(null, {profile: profile, accessToken: accessToken, refreshToken: refreshToken});
  }));

  var scope = {scope: 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/googletalk email'};
  scope.accessType =  'offline';
  app.get('/auth/google', passport.authenticate('google', scope));
  app.get('/auth/google/cb', passport.authenticate('google', {failureRedirect: '/'}), authed);
  app.get('/logout', function (req, res) { req.logout(); res.redirect('/'); });
  app.get(/.*/, render);
  app.set('views', __dirname + '/views');
  var server = app.listen(+(process.env.PORT || 4444), function () {
    console.log('Listening on', server.address().port);
  });
}

function authed(req, res) { res.redirect('/'); }

function render(req, res) {
  res.locals.user = req.user;
  res.render('home.jade');
}

main();
