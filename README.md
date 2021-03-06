# gmail-notifier

A module that allows receiving new mail notifications from GMail via XMPP.  There are a few hoops involved in getting this that are abstracted away by this module.

[![NPM info](https://nodei.co/npm/gmail-notifier.png?downloads=true)](https://npmjs.org/package/gmail-notifier)

This module has been tested under limited scenarios.  If you find any issues, please feel free to report them.

## Install

    npm install gmail-notifier


## API

```javascript
   var notify = require('gmail-notifier');
   notify(oauthRefreshToken)
    .on('newmails', function onNewMails(mails) {
      // mails is an array of mails.  party on and do what you want.
    })
    .on('error', function (err) {
      // something went wrong.
    });
```

### Configuration and other details

* You need an OAuth2 refresh token.  Take a look at the sample express app to get test tokens to play around.  OAuth2 Refresh Tokens are effectively permanent, so you could store this in a database if you'd like (recommended).

* The scope of the OAuth2 refresh token should be *https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/googletalk email*

* The access type for the OAuth2 refresh token should be *offline*

* The module requires [Google API](https://console.developers.google.com) Credentials.  The client ID should be provided via *process.env.GAPI_KEY* and the secret should be provided via *process.env.GAPI_SECRET*

* The ClientID used should be configured in [Google API Console](https://console.developers.google.com) to have permissions to *GMail API* and *Google+ API*

### Sample Express APP to generate OAuth2 Tokens

You start the app via:

```bash
   $> GAPI_KEY=<clientId> GAPI_SECRET=<secret> GAPI_CB_URL=http://localhost:4444/auth/google/cb REDISCLOUD_URL=redis://user:pwd@host:port node express/web.js
```

Note that the app requires a bunch of environment variables.  In particular, make sure that the callback URL provided in the environment variable matches the one configured in the Google API Console.

Note also that the refresh tokens are only provided vai the OAuth2 flow the first time a user is authorized. So, if you use the web app provided to fetch the tokens, you should copy the refresh tokens down.  While they are stored in the redis session, this expires at some point and it then becomes difficult to fetch new refresh tokens via this mechanism.

### Unique mail label

When XMPP notifications arrive, the module reads the recent mails from GMail.  To make sure that the same mails don't get read twice in a row, it marks the mails with a label.

This label is named *gmailnotify*.  If you want to bypass this logic or provide your own implementation to dedupe stuff, you can do this by handling new mail notifications from XMPP yourself.

```javascript

   on('xmpp:newmail', function onXmppMail(info) {
     info.stop = true; // do not fetch from GMail.
     // do your own thing here.
   });
```

If you are looking for a module to read mails from gmail, take a look at [node-gmail-api](https://npmjs.org/package/node-gmail-api) which is a very simple interface to gmail.

### Simplified mails

If you do not want to deal with the full complexity of the GMail message bodies and only want a simplified version, you can do the following which uses [parse-reply](https://npmjs.org/package/parse-reply) to remove any forwarded or replied parts from the email and converts HTML to plain text via [html-to-text](https://npmjs.org/package/html-to-text).


```javascript
   var notify = require('gmail-notifier');
   var notifier = notify(oauthRefreshToken)
    .on('newmails', function onNewMails(mails) {
      // if you want gmail-notifier to simplify the mails do:
      notifier.emit('simplify-emails', mails);
    })
    .on('simplified-email', function (info) {
      // this event will only happen in response to any emails triggered via the 'simplify-emails' event.
      // each info will have {error: 'any error', mail: 'simplified mail'} fields.
      // in case of error, the mail field will reflect the original complex mail.
      // Please file an issue against this project with a copy of the <mail> argument in that case
      // and I'll figure out how to summarize that specific mail.
      // Also note that mail.snippet will still be available.
    })
    .on('error', function (err) {
      // something went wrong.
    });
```
