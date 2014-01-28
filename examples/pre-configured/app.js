/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var partials = require('express-partials');
var passport = require('passport');
// npm passport-openidconnect package is not up to date
var OpenidConnectStrategy = require('passport-openidconnect').Strategy;

var OP_DOMAIN_NAME = 'mitreid.org'; //'--insert-your-openid-provider-domain-name-here--'

var SCOPE = 'profile email';
// register a new client at e.g. https://mitreid.org/manage/dev/dynreg
var CLIENT_ID = 'abf911b1-47ba-4163-881d-2b995cba8a1d';//'--insert-oidc-client-id-here--';
var CLIENT_SECRET = 'AI0R7dSkCt5ye30lKeMIS35whbIOMYASLvwd-nZeVW7sLJSchpI1z7q_UNugyXTFkTl4AKWdqiwykje_y-msXJA';//'--insert-oidc-client-secret-here--';
// your callback url
var CALLBACK_URL = '/auth/oidc/callback';
// OpenID Connect Provider endpoints e.g. from https://mitreid.org/.well-known/openid-configuration/
var AUTHORIZATION_URL = 'https://' + OP_DOMAIN_NAME + '/authorize';
var TOKEN_URL = 'https://' + OP_DOMAIN_NAME + '/token';
var USER_INFO_URL = 'https://' + OP_DOMAIN_NAME + '/userinfo';

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new OpenidConnectStrategy({
  scope: SCOPE,
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: CALLBACK_URL,
  authorizationURL: AUTHORIZATION_URL,
  tokenURL: TOKEN_URL,
  userInfoURL: USER_INFO_URL
},
  function(iss, sub, profile, accessToken, refreshToken, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

var app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//app.set('view options', {layout: 'views/layout.ejs'});
app.use(partials());
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

app.get('/auth/oidc/login', passport.authenticate('openidconnect',
  {callbackURL: CALLBACK_URL, failureRedirect: '/login'}),
  function(req, res){
    // The request will be redirected to OP for authentication, so this
    // function will not be called.
});

app.get(CALLBACK_URL, passport.authenticate('openidconnect',
  {callbackURL: CALLBACK_URL, failureRedirect: '/login'}),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}