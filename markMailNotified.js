var request = require('request');
module.exports = markMailNotified;

function markMailNotified(accessToken, messageId, label, done) {
  request.post({
    url: 'https://www.googleapis.com/gmail/v1/users/me/messages/' + messageId + '/modify',
    headers: {Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json'},
    body: JSON.stringify({addLabelIds: [label.id]})
  }, function (err, response, body) {
    if (err) return done(err);
    var info = JSON.parse(body);
    if (info.error) return done(info.error);
    return done();
  });
}
