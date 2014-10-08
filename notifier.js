var Client = require('node-xmpp-client');
var xmpp = require('node-xmpp-core');
var EventEmitter = require('events').EventEmitter;

var getFreshToken = require('./getFreshToken');
var newMailsQueue = require('./newMailsQueue');
var getEmail = require('./getEmail');
var simplifyMail = require('./simplifyMail');

function fetchAndHandleNotifications(refreshToken) {
  var ret = new EventEmitter();
  var mailsToSimplify = [];
  var queue = newMailsQueue(ret, refreshToken);

  getFreshToken(refreshToken, function (err, accessToken) {
    if (err) return ret.emit('error', err);
    getEmail(accessToken, function (err, emailId) {
      if (err) return ret.emit('error', err);
      startXMPP(accessToken, emailId);
    });
  });

  return ret.on('read-emails', function (info) { if (!info.stop) queue.readMore(); })
    .on('simplify-emails', function (mails) {
      var initLength = mailsToSimplify.length;
      mailsToSimplify = mailsToSimplify.concat(mails || []);
      if (!initLength) startSimplifying();
    });

  function startXMPP(accessToken, emailId) {
    var params = {jid: emailId, host: 'talk.google.com', port: 5222, oauth2_token: accessToken};
    params.oauth2_auth = 'http://www.google.com/talk/protocol/auth';

    var client = new Client(params)
      .on('online', function (identity) {
        ret.emit('online', identity);
        client.send(getEnableMailNotificationsStanza(identity.jid));
        client.send(getSubscribeMailNotificationsStanza(identity.jid));
      }).on('stanza', function (stanza) {
        ret.emit('stanza', stanza);
        if (stanza.is('iq') && stanza.attrs.type == 'set') {
          var reply = processStanza(stanza);
          if (reply) client.send(reply);
        }
      }).on('error', function (err) {
        console.error('Sorry! There was an XMPP error!', err);
        return ret.emit('error', err);
      });
  }

  function processStanza(stanza) {
    var info = {stop: false, stanza: stanza};
    if (stanza.getChild('new-mail', 'google:mail:notify')) {
      ret.emit('xmpp:newmail', info);
      ret.emit('read-emails', info);
      return getReplyStanza(stanza);
    }
  }

  function startSimplifying() {
    if (!mailsToSimplify.length) return;
    getFreshToken(refreshToken, function (err, accessToken) {
      if (err) return complete(err);
      simplifyMail(accessToken, mailsToSimplify[0], function (err, _simplified) {
        return complete(err);
      });
    });

    function complete(err) {
      ret.emit('simplified-email', {error: err, mail: mailsToSimplify.shift()});
      startSimplifying();
    }
  }
}

function getEnableMailNotificationsStanza(jid) {
  var to = jid.user + '@' + jid.domain;
  return new xmpp.ltx.Element('iq', {type: 'set', to: to, id: 'us1'})
    .c('usersetting', {xmlns: 'google:setting'})
    .c('mailnotifications', {value: 'true'});
}

function getSubscribeMailNotificationsStanza(jid) {
  var to = jid.user + '@' + jid.domain;
  return new xmpp.ltx.Element('iq', {type: 'get', to: to,  id: 'mr1'})
    .c('query', {xmlns: 'google:mail:notify', 'newer-than-time': Date.now()});
}

function getReplyStanza(stanza) {
  return new xmpp.ltx.Element('iq', {
    type: 'result', from: stanza.attrs.from, to: stanza.attrs.to, id: stanza.attrs.id
  });
}

function main() {
  if (!process.env.GAPI_KEY) return console.error('Please set environment value GAPI_KEY');
  if (!process.env.GAPI_SECRET) return console.error('Please set environment value GAPI_SECRET');
  if (!process.env.GAPI_REFRESH_TOKEN) return console.error('Please set environment value GAPI_REFRESH_TOKEN');

  var ff = fetchAndHandleNotifications(process.env.GAPI_REFRESH_TOKEN)
    .on('online', function (identity) { console.log('Logged in as', identity.jid); })
    .on('xmpp:newmail', function onXmppMail(info) {
      console.log('There was an XMPP notification for new mail');
    })
    .on('newmails', function onNewMails(mails) {
      console.log('Got new mails');
      mails.forEach(function (mm) { console.log(mm.id, mm.snippet); });
      ff.emit('simplify-emails', mails);
    })
    .on('simplified-email', function (info) {
      if (info.error) console.error('Simplification failed', JSON.stringify(info));
      else console.log(JSON.stringify(info.mail, null, 2));
    })
    .on('error', function onError(err) {
      console.error('An error occured', err);
      process.exit(1);
    });

  ff.emit('read-emails', {});
}

if (require.main === module) main();
