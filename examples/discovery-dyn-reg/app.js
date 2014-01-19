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

var RP_DOMAIN_NAME = 'localhost.airydrive.org'; //'--insert-your-relying-party-domain-name-here--'

var CLIENT_NAME = 'AiryDrive - test2';
// your callback url
var CALLBACK_URL = '/auth/oidc/callback';
// your callback uris
var REDIRECT_URIS = ['http://' + RP_DOMAIN_NAME + CALLBACK_URL];
// scopes
var SCOPE = 'profile email';

/* uncomment - if you want initialize Configuration database with Mitreid's data sample
// register a new client at e.g. https://mitreid.org/manage/dev/dynreg
var OP_DOMAIN_NAME = 'mitreid.org'; //'--insert-your-openid-provider-domain-name-here--'

var CLIENT_ID = 'abf911b1-47ba-4163-881d-2b995cba8a1d';//'--insert-oidc-client-id-here--';
var CLIENT_SECRET = 'AI0R7dSkCt5ye30lKeMIS35whbIOMYASLvwd-nZeVW7sLJSchpI1z7q_UNugyXTFkTl4AKWdqiwykje_y-msXJA';//'--insert-oidc-client-secret-here--';
 // OpenID Connect Provider endpoints e.g. from https://mitreid.org/.well-known/openid-configuration/
var AUTHORIZATION_URL = 'https://' + OP_DOMAIN_NAME + '/authorize';
var TOKEN_URL = 'https://' + OP_DOMAIN_NAME + '/token';
var USER_INFO_URL = 'https://' + OP_DOMAIN_NAME + '/userinfo';
*/

// Configuration database with oidc and user tables
var Config = {oidc: [], user: []};

/* uncomment - if you want initialize Configuration database with Mitreid's data sample
Config.oidc.push({id: 1, provider: {
  issuer: 'https://' + OP_DOMAIN_NAME + '/',
  authorizationURL: AUTHORIZATION_URL,
  tokenURL: TOKEN_URL,
  userInfoURL: USER_INFO_URL,
  clientID: CLIENT_ID
}, reg: {
  clientSecret: CLIENT_SECRET
}});

Config.user.push({
  id: 1, oidc_id: 1, email: 'user@mitreid.org'
});
*/

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

function findOidcById(id, fn) {
  for (var i = 0, len = Config.oidc.length; i < len; i++) {
    var oidc = Config.oidc[i];
    if (oidc.id === id) {
      return fn(null, oidc);
    }
  }
  return fn(null, null);
}

function findOidcByIssuer(iss, fn) {
  for (var i = 0, len = Config.oidc.length; i < len; i++) {
    var oidc = Config.oidc[i];
    if (oidc.provider.issuer === iss) {
      return fn(null, oidc);
    }
  }
  return fn(null, null);
}

function findUserByEmail(email, fn) {
  for (var i = 0, len = Config.user.length; i < len; i++) {
    var user = Config.user[i];
    if (user.email === email) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

function save_configuration(identifier, provider, reg, next) {
  var oidc_id = Config.oidc.length + 1;
  Config.oidc.push({id: oidc_id, provider: provider, reg: reg});

  var user_id = Config.user.length + 1;
  Config.user.push({id: user_id, oidc_id: oidc_id, email: identifier});
  return next();
};

function update_configuration(identifier, issuer, done) {
  findOidcByIssuer(issuer, function(err, oidc) {
    if (oidc) {
      var user_id = Config.user.length + 1;
      Config.user.push({id: user_id, oidc_id: oidc.id, email: identifier});

      return done(null, {
        identifier: identifier,
        authorizationURL: oidc.provider.authorizationURL,
        tokenURL: oidc.provider.tokenURL,
        userInfoURL: oidc.provider.userInfoURL,
        clientID: oidc.provider.clientID,
        clientSecret: oidc.reg.clientSecret,
        callbackURL: CALLBACK_URL
      });
    } else {
      return done(err, null);
    }
  });

};

function load_configuration(identifier, done) {
  findUserByEmail(identifier, function(err, user) {
    if (user) {
      findOidcById(user.oidc_id, function(err, oidc) {
        if (oidc) {
          return done(err, {
            identifier: identifier,
            authorizationURL: oidc.provider.authorizationURL,
            tokenURL: oidc.provider.tokenURL,
            userInfoURL: oidc.provider.userInfoURL,
            clientID: oidc.provider.clientID,
            clientSecret: oidc.reg.clientSecret,
            callbackURL: CALLBACK_URL
          });
        } else {
          return done('Oidc not found', null);
        }
      });
    } else {
      return done(err, null);
    }
  })
};

var options = {};
options.name = CLIENT_NAME;
options.redirectURI = REDIRECT_URIS;

require('passport-openidconnect').config(update_configuration);

var registration = require('passport-openidconnect').registration(options, save_configuration);
require('passport-openidconnect').register(registration);

var strategy = new OpenidConnectStrategy({
  identifierField: 'resource',
  scope: SCOPE
},
    function(iss, sub, profile, accessToken, refreshToken, done) {
        process.nextTick(function () {
            return done(null, profile);
        });
    }
);

passport.use(strategy);

strategy.configure(load_configuration);

var app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
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

app.get(CALLBACK_URL,
    passport.authenticate('openidconnect', { failureRedirect: '/login' }),
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