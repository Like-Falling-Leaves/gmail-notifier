var request = require('request');
module.exports = fetchAttachment;
function fetchAttachment(accessToken, messageId, attachmentId, done) {
  request(
    {
      url: 'https://www.googleapis.com/gmail/v1/users/me/messages/' + messageId + '/attachments/' + attachmentId,
      headers: { Authorization: 'Bearer ' + accessToken }
    },
    function (err, response, body) {
      if (err) return done(err);
      try {
        var info = JSON.parse(body);
        if (info.error) return done(err);
        if (info.data) return done(null, new Buffer(info.data, 'base64').toString());
      } catch (e) {
        return done(e);
      }
      return done('Unexpected response');
    });
}
