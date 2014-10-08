var parseReply = require('parse-reply');
var html2text = require('html-to-text').fromString;
var fetchAttachment = require('./fetchAttachment');
var emailRE = new RegExp(parseReply.emailRE, 'i');

module.exports = simplifyMail;

function simplifyMail(accessToken, mm, done) {
  var payload = mm.payload;
  delete mm.payload;
  payload.headers.forEach(function (hh) {
    if (hh.name.toLowerCase() == 'from') mm.from = hh.value;
    if (hh.name.toLowerCase() == 'to') mm.to = hh.value;
    if (hh.name.toLowerCase() == 'subject') mm.subject = hh.value;
  });
  mm.fromEmail = scrapeEmail(mm.from);
  mm.toEmail = scrapeEmail(mm.to);
  mm.origBody = payload.body;
  mm.files = [];
  mm.unknownParts = [];
  payload.parts.forEach(processPart);

  mm.htmlBodyAsText = parseReply(html2text(mm.htmlBody || '')).trim();
  if (mm.plainBody) mm.body = parseReply(mm.plainBody || '').trim();
  else if (mm.htmlBodyAsText) mm.body = mm.htmlBodyAsText;
  else mm.body = (mm.origBody || {}).data || '';

  var attachmentsToFetch = [];
  mm.files.forEach(function (ff) { if (ff.attachmentId) attachmentsToFetch.push(ff); });

  fetchAttachments(accessToken, mm, attachmentsToFetch, done);

  function processPart(pp) {
    if (pp.filename) {
      mm.files.push({mimeType: pp.mimeType, attachmentId: pp.body.attachmentId, data: pp.body.data});
      return;
    }
    if (pp.mimeType == 'text/plain') mm.plainBody = pp.body.data;
    else if (pp.mimeType == 'text/html') mm.htmlBody = pp.body.data;
    else if (pp.mimeType == 'multipart/alternative') pp.parts.forEach(processPart);
    else mm.unknownParts.push(pp);
  }  
}

function fetchAttachments(accessToken, mm, attachments, done) {
  if (!attachments.length) return done(null, mm);
  var next = attachments.pop();
  fetchAttachment(accessToken, mm.id, next.attachmentId, function (err, data) {
    if (err) return done(err);
    next.data = data;
    fetchAttachments(accessToken, mm, attachments, done);
  });
}

function scrapeEmail(src) {
  var mm = src.match(emailRE);
  if (mm) return mm[0];
  return '';
}
