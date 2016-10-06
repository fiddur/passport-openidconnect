/* eslint-env mocha */
'use strict';

var EventEmitter = require('events');
var assert = require('assert');
var sinon = require('sinon');

// Mocks, stubs etc.
var webfinger = sinon.stub(require('webfinger'), 'webfinger');
var https = sinon.stub(require('https'), 'request');

// Code under test.
var setup = require('setup');

describe('OpenID Connect Dynamic Discovery', function () {
  beforeEach(function () {
    // Reset all mocks.
    webfinger.reset();
    https.reset();
  });

  describe('2.1. Identifier Normalization', function () {
    it('lets webfinger module handle normalization', function (done) {
      setup.discovery('joe@example.com', function (err, issuer) {
        assert.ifError(err);
        assert.equal(issuer, 'myissuer');
        assert(webfinger.calledOnce);
        assert(webfinger.calledWith(
          'joe@example.com', 'http://openid.net/specs/connect/1.0/issuer'
        ));
        done();
      });

      webfinger.yield(null, {
        links: [{ rel: 'http://openid.net/specs/connect/1.0/issuer', href: 'myissuer' }]
      });
    });
  });

  describe('4. Obtaining OpenID Provider Configuration Information', function () {
    it('should copy relevant parts from .well-known/openid-configuration', function (done) {
      var req = new EventEmitter();
      req.end = function () {};
      https.returns(req);

      setup.configuration('myissuer', function (err, result) {
        assert.ifError(err);
        assert.equal(result.issuer, 'myissuer');
        assert.equal(result.authorizationURL, 'foo');
        assert.equal(result.tokenURL, 'bar');
        assert.equal(result.userInfoURL, 'baz');
        assert.equal(result.registrationURL, 'qux');
        done();
      });

      var res = new EventEmitter();
      https.yield(res);

      res.emit('data', JSON.stringify({
        issuer: 'myissuer',
        authorization_endpoint: 'foo',
        token_endpoint: 'bar',
        userinfo_endpoint: 'baz',
        registration_endpoint: 'qux'
      }));
      res.statusCode = 200;
      res.emit('end');
    });

    it('should fail on non-JSON', function (done) {
      var req = new EventEmitter();
      req.end = function () {};
      https.returns(req);

      setup.configuration('myissuer', function (err, result) {
        assert(err instanceof Error);
        done();
      });

      var res = new EventEmitter();
      https.yield(res);

      res.emit('data', 'not json');
      res.statusCode = 200;
      res.emit('end');
    });
  });
});
