var Gmail = require('node-gmail-api');
var getFreshToken = require('./getFreshToken');
var markMailNotified = require('./markMailNotified');

module.exports = getNewMailsAndMarkModified;

function getNewMailsAndMarkModified(accessToken, label, done) {
  var mails = [];
  var gmail = new Gmail(accessToken);
  var req = gmail.messages('in:inbox is:unread -label:' + label.name, {max: 100})
    .on('error', finish)
    .on('end', finish)
    .on('data', processMail);

  function finish(err) {
    if (err) console.error('Error reading mail', err);
    if (req && req.close) req.close();
    if (req && req.end) req.end();
    if (mails.length) return markMailsNotified(accessToken, mails, label, [], done);
    done(err, mails);
  }

  function processMail(dd) {
    var cleanedUp = normalizeMail(dd);
    mails.push(cleanedUp);
    console.log('processed mail', dd.snippet);
  }
}

function markMailsNotified(accessToken, mails, label, processed, done) {
  if (!mails.length) return done(null, processed)
  var next = mails.shift();
  markMailNotified(accessToken, next.id, label, function (err) {
    if (err) console.error('Failed to mark message as processed, so will look at it later on', next.id, err);
    else processed.push(next);
    return markMailsNotified(accessToken, mails, label, processed, done);
  });
}

function normalizeMail(dd) {
  if (dd.size && dd.data) dd.data = new Buffer(dd.data, 'base64').toString();
  else if (typeof(dd) == 'object') {
    for (var key in dd) normalizeMail(dd[key]);
  }
  return dd;
}

