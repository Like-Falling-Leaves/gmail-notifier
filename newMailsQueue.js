var newMails = require('./newMails');
var getFreshToken = require('./getFreshToken');
var getSpecialLabelId = require('./getSpecialLabelId');

module.exports = getQueue;

function getQueue(event, refreshToken) {
  var pending = [], label = null;
  return {readMore: readMore};

  function readMore() {
    pending.push({date: new Date()});
    if (pending.length == 1) fetchNow();
  }

  function fetchNow() {
    return getFreshToken(refreshToken, function (err, accessToken) {
      if (err) return fetchNext(err);
      if (!label) return getSpecialLabelId(accessToken, function (err, _label) {
        if (err) return fetchNext(err);
        label = _label;
        fetchNow();
      });
      newMails(accessToken, label, function (err, mails) {
        if (mails && mails.length) event.emit('newmails', mails);
        return fetchNext(err);
      });
    });
  }

  function fetchNext(err) {
    if (err) event.emit('error', err);
    pending.pop();
    if (!pending.length) return;
    return fetchNow();
  }
}
