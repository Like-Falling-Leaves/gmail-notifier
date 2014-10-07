var request = require('request');
module.exports = getSpecialLabelId;

var specialLabelName = 'gmailnotify';
function getSpecialLabelId(accessToken, done) {
  request({
    url: 'https://www.googleapis.com/gmail/v1/users/me/labels',
    headers: { Authorization: 'Bearer ' + accessToken},
  }, function (err, response, body) {
    if (err) return done(err);
    var labels = JSON.parse(body);
    if (labels.error) return done(labels.error);
    var found = null;
    labels.labels.forEach(function (ll) {
      if (ll.type == 'user' && ll.name == specialLabelName) found = ll;
    });
    if (found) return done(null, found);
    createSpecialLabel(accessToken, done);
  });
}

function createSpecialLabel(accessToken, done) {
  var label = {name: specialLabelName};
  label.labelListVisibility = 'labelHide';
  label.messageListVisibility = 'show';
  request.post({
    url: 'https://www.googleapis.com/gmail/v1/users/me/labels',
    headers: {Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json'},
    body: JSON.stringify(label)
  }, function (err, response, body) {
    if (err) return done(err);
    var label = JSON.parse(body);
    if (label.error) return done(label.error);
    return done(null, label);
  });
}
