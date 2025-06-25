var CREDS_SHEET_ID = 'YOUR_CREDENTIALS_SHEET_ID';
var ATTENDANCE_SHEET_ID = 'YOUR_ATTENDANCE_SHEET_ID';

function doPost(e) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var data = JSON.parse(e.postData.contents);
    var id = data.id;
    var pass = data.password;
    var ip = data.ip || '';

    if (!id || !pass) {
      return jsonOutput({ success:false, error:'Missing fields' });
    }

    if (!isSignInOpen()) {
      return jsonOutput({ success:false, error:'Sign-in closed' });
    }

    var credsSheet = SpreadsheetApp.openById(CREDS_SHEET_ID).getSheetByName('Credentials');
    var creds = credsSheet.getDataRange().getValues();
    var passHash = hash(pass);

    for (var i = 1; i < creds.length; i++) {
      if (creds[i][0] == id && creds[i][1] == passHash) {
        recordAttendance(id, ip);
        return jsonOutput({ success:true });
      }
    }
    return jsonOutput({ success:false, error:'Invalid ID or password' });
  } finally {
    lock.releaseLock();
  }
}

function recordAttendance(id, ip) {
  var sheet = SpreadsheetApp.openById(ATTENDANCE_SHEET_ID).getSheetByName('Attendance');
  sheet.appendRow([new Date(), id, ip]);
  SpreadsheetApp.flush();
}

function hash(str) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return raw.map(function(b){
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isSignInOpen() {
  var prop = PropertiesService.getScriptProperties().getProperty('SIGN_IN_OPEN');
  return prop === 'true';
}

function openSignIn() {
  PropertiesService.getScriptProperties().setProperty('SIGN_IN_OPEN', 'true');
}

function closeSignIn() {
  PropertiesService.getScriptProperties().setProperty('SIGN_IN_OPEN', 'false');
}
