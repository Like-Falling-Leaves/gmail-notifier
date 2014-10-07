var Gmail = require('node-gmail-api');
var getFreshToken = require('./getFreshToken');

module.exports = readNewMail;

var state = {mails: [], pending: []};
function readNewMail(accessToken, refreshToken, done) {
  state.pending.push(done);
  if (state.pending.length > 1) return;

  if (!refreshToken) return doReadMail(accessToken); 
  return getFreshToken(refreshToken, function (err, accessToken) {
    if (err) complete(err);
    else doReadMail(accessToken);
  })
}

function complete(err, result) {
  var cbs = state.pending;
  state.pending = [];
  cbs.forEach(function (cb) {
    try { cb(err, result); } catch (e) {}
    result = [];
  });
}

function doReadMail(accessToken) {
  var mails = [];
  var gmail = new Gmail(accessToken);
  var req = gmail.messages('is:unread', {max: 100})
    .on('error', finish)
    .on('end', endRound)
    .on('data', processMail);

  function endRound() {
    if (mails.length) return setTimeout(function () { doReadMail(accessToken); });
    finish();
  }

  function finish(err) {
    if (err) console.error('Error reading mail', err);
    var allMails = state.mails;
    state.mails = [];
    complete(err, allMails);
    if (req && req.close) req.close();
    if (req && req.end) req.end();
  }

  function processMail(dd) {
    var cleanedUp = normalizeMail(dd);
    mails.push(cleanedUp);
    state.mails.push(cleanedUp);
    console.log('processed mail', dd.snippet);
  }
}

function normalizeMail(dd) {
  if (dd.size && dd.data) dd.data = new Buffer(dd.data, 'base64').toString();
  else if (typeof(dd) == 'object') {
    for (var key in dd) normalizeMail(dd[key]);
  }
  return dd;
}

