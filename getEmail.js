var request = require('request');
var getFreshToken = require('./getFreshToken');

module.exports = getEmail;

function getEmail(accessToken, done) {
  request({
    url: 'https://www.googleapis.com/plus/v1/people/me',
    headers: {
      Authorization: 'Bearer ' + accessToken
    }
  }, function (err, response, body) {
    if (err) return done(err);
    try {
      var info = JSON.parse(body);
      if (info && info.emails && info.emails[0] && info.emails[0].value) {
        return done(null, info.emails[0].value, accessToken);
      }
    } catch (e) {
      return done(e);
    }
  });
}

