/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var passport = require('passport');
// npm passport-openidconnect package is not up to date
var MitreIDStrategy = require('passport-openidconnect').Strategy;

var DOMAIN_NAME = '--insert-your-domain-name-here--';

var SCOPES = 'profile email';
// register a new client on https://mitreid.org/manage/dev/dynreg
var MITREID_CLIENT_ID = '--insert-mitreid-client-id-here--';
var MITREID_CLIENT_SECRET = '--insert-mitreid-client-secret-here--';
// your callback url
var CALLBACK_URL = 'http://' + DOMAIN_NAME + '/auth/mitreid/callback';
// from https://mitreid.org/.well-known/openid-configuration/
var AUTHORIZATION_URL = 'https://mitreid.org/authorize';
var TOKEN_URL = 'https://mitreid.org/token';
var USER_INFO_URL = 'https://mitreid.org/token';

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// Use the MitreIDStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an Issuer, User ID, User profile,
//   accessToken and refreshToken), and invoke a callback with a user object.
passport.use(new MitreIDStrategy({
        scope: SCOPES,
        clientID: MITREID_CLIENT_ID,
        clientSecret: MITREID_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        authorizationURL: AUTHORIZATION_URL,
        tokenURL: TOKEN_URL,
        userInfoURL: USER_INFO_URL},
    function(iss, sub, profile, accessToken, refreshToken, done) {
        process.nextTick(function () {
            return done(null, user);
        });
    }
));

var app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
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

// GET /auth/mitreid
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in MitreID authentication will involve
//   redirecting the user to mitreid.org.  After authorization, MitreID
//   will redirect the user back to this application at /auth/mitreid/callback
app.get('/auth/mitreid',
    passport.authenticate('openidconnect', { failureRedirect: '/login' }),
    function(req, res){
        // The request will be redirected to MitreID for authentication, so this
        // function will not be called. ???
        //
        // Successful authentication, redirect home.
        res.redirect('/');
});

// GET /auth/mitrid/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/mitreid/callback',
    passport.authenticate('mitreid', { failureRedirect: '/login' }),
    function(req, res) {
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