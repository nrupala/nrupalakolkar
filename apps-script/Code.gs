/**
 * nrupalakolkar.com / devinfo.dev book forms -> Google Sheet + email.
 *
 * This is a Google Apps Script Web App BOUND to a Google Sheet. On each POST it
 * appends a row to the sheet (tab per form type) AND emails Nrupal. The
 * Cloudflare Worker forwards submissions here after writing a durable copy to
 * KV, so the Sheet is the human-readable log and email is the live ping.
 *
 * Contact-form emails are also labeled in Gmail by topic (consulting, boards,
 * ...) via GmailApp — no Gmail filters needed.
 *
 * Setup:
 *  1. Create a Google Sheet (this becomes the datastore).
 *  2. Extensions > Apps Script. Paste this file as Code.gs.
 *  3. Set NOTIFY_EMAIL and SHARED_SECRET below (make SHARED_SECRET long/random).
 *  4. Deploy > New deployment > Web app:
 *       Execute as: Me    |    Who has access: Anyone
 *     Copy the Web app URL (ends in /exec).
 *  5. In the Cloudflare Worker:
 *       wrangler secret put APPSCRIPT_URL      -> paste the /exec URL
 *       wrangler secret put APPSCRIPT_SECRET   -> the same SHARED_SECRET
 *  6. After pasting a new version of this file: Deploy > Manage deployments >
 *     edit the deployment > New version, then run any function once from the
 *     editor to approve the Gmail permission (labeling needs it).
 */

var NOTIFY_EMAIL = 'nrupalakolkar@gmail.com';
var SHARED_SECRET = 'REPLACE_WITH_A_LONG_RANDOM_STRING';

// Contact-form Topic -> Gmail label. Must match the Topic dropdown values on
// the site. 'Other' intentionally maps to nothing (stays unlabeled in inbox).
var TOPIC_LABELS = {
  'Consulting': 'consulting',
  'Boards & advisory': 'boards',
  'Data analytics': 'analytics',
  'Investment analytics': 'investing',
  'AI / LLM infrastructure': 'ai-infra',
  'Electrical engineering': 'electrical',
  'Process improvement': 'ops',
  'Open-source collaboration': 'open-source',
  'STEM mentorship': 'mentorship'
};

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (SHARED_SECRET && data.secret !== SHARED_SECRET) {
      return _json({ ok: false, error: 'unauthorized' });
    }
    var type = String(data.type || 'unknown').toLowerCase();
    _append(type, data);
    _email(type, data);
    _applyTopicLabel(type, data);
    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function _columns(type) {
  if (type === 'order') return ['name', 'email', 'format', 'quantity', 'address'];
  if (type === 'notify') return ['email'];
  if (type === 'contact') return ['name', 'email', 'subject', 'message'];
  return ['email'];
}

function _append(type, d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(type) || ss.insertSheet(type);
  var cols = _columns(type);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp'].concat(cols).concat(['ref', 'ip']));
  }
  var row = [new Date()];
  for (var i = 0; i < cols.length; i++) row.push(d[cols[i]] || '');
  row.push(d.ref || '', d.ip || '');
  sheet.appendRow(row);
}

function _email(type, d) {
  var subject, body;
  if (type === 'order') {
    subject = 'Signed hard-copy request -- ' + (d.name || '');
    body = 'New signed hard-copy request\n\n'
      + 'Name: ' + (d.name || '') + '\n'
      + 'Email: ' + (d.email || '') + '\n'
      + 'Format: ' + (d.format || '') + '\n'
      + 'Quantity: ' + (d.quantity || '') + '\n'
      + 'Shipping address:\n' + (d.address || '') + '\n\n'
      + 'Ref: ' + (d.ref || '') + '\nWhen: ' + (d.ts || '');
  } else if (type === 'notify') {
    subject = 'Book launch-notify signup';
    body = 'Email: ' + (d.email || '') + '\nWhen: ' + (d.ts || '');
  } else if (type === 'contact') {
    subject = 'Contact: ' + (d.subject || '(no subject)');
    body = 'From: ' + (d.name || '') + ' <' + (d.email || '') + '>\n\n'
      + (d.message || '') + '\n\nRef: ' + (d.ref || '') + '\nWhen: ' + (d.ts || '');
  } else {
    subject = 'Form submission: ' + type;
    body = JSON.stringify(d, null, 2);
  }
  MailApp.sendEmail({ to: NOTIFY_EMAIL, replyTo: d.email || NOTIFY_EMAIL, subject: subject, body: body });
}

// Best-effort: label the just-sent contact email by topic. The email is
// already delivered at this point, so a labeling miss loses nothing.
function _applyTopicLabel(type, d) {
  if (type !== 'contact') return;
  var labelName = TOPIC_LABELS[String(d.subject || '').trim()];
  if (!labelName || !d.ref) return;
  try {
    var label = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
    Utilities.sleep(3000); // let Gmail index the sent message
    var q = '"' + String(d.ref).replace(/"/g, '') + '" newer_than:2h';
    var threads = GmailApp.search(q, 0, 1);
    if (threads.length > 0) threads[0].addLabel(label);
  } catch (e) {
    // labeling is best-effort; the email itself was already sent
  }
}

function _json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
