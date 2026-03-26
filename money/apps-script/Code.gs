/**
 * Build stamp: 2026-03-26
 * Money Dashboard Apps Script API
 *
 * Deploy as Web app:
 * - Execute as: Me
 * - Who has access: Anyone
 */

const TZ = 'Asia/Seoul';
const SHEET_TRANSACTIONS = 'Transactions';
const SHEET_COUNTERPARTIES = 'Counterparties';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    const payload = body.payload || {};

    let result;
    switch (action) {
      case 'listCounterparties':
        result = listCounterparties_();
        break;
      case 'addCounterparty':
        result = addCounterparty_(payload);
        break;
      case 'addTransaction':
        result = addTransaction_(payload);
        break;
      case 'getDashboard':
        result = getDashboard_();
        break;
      default:
        throw new Error('Unsupported action: ' + action);
    }

    return jsonResponse_({ ok: true, ...result });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.message || 'Unknown server error' });
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function listCounterparties_() {
  const sheet = getSheet_(SHEET_COUNTERPARTIES);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { counterparties: [] };

  const header = values[0];
  const rows = values.slice(1).filter(r => String(r[0]).trim() !== '');

  const counterparties = rows.map(row => ({
    id: String(row[header.indexOf('counterparty_id')] || ''),
    name: String(row[header.indexOf('name')] || ''),
    category: String(row[header.indexOf('category')] || ''),
    description: String(row[header.indexOf('description')] || ''),
    phone: String(row[header.indexOf('phone')] || ''),
    active: String(row[header.indexOf('active')] || 'TRUE').toUpperCase() === 'TRUE',
    createdAtKst: String(row[header.indexOf('created_at_kst')] || ''),
  }));

  return { counterparties };
}

function addCounterparty_(payload) {
  const name = normalizeText_(payload.name);
  const category = normalizeText_(payload.category).toLowerCase();
  const description = normalizeText_(payload.description);
  const phone = normalizeText_(payload.phone);

  if (!name) throw new Error('name is required');
  if (category !== 'tutee' && category !== 'merchant') throw new Error('category must be tutee or merchant');
  if (!description) throw new Error('description is required');
  if (!phone) throw new Error('phone is required');

  const id = Utilities.getUuid();
  const timestampUtc = new Date().toISOString();
  const timestampKst = formatKstNow_();

  const sheet = getSheet_(SHEET_COUNTERPARTIES);
  sheet.appendRow([id, name, category, description, phone, 'TRUE', timestampUtc, timestampKst]);

  return { id };
}

function addTransaction_(payload) {
  const type = normalizeText_(payload.type).toLowerCase();
  const person = normalizeText_(payload.person);
  const counterpartyId = normalizeText_(payload.counterpartyId);
  const dateTimeKst = normalizeText_(payload.dateTimeKst);
  const amountKrw = Number(payload.amountKrw);
  const description = normalizeText_(payload.description);

  if (type !== 'received' && type !== 'spent') throw new Error('type must be received or spent');
  if (person !== 'Josh' && person !== 'Victoria') throw new Error('person must be Josh or Victoria');
  if (!counterpartyId) throw new Error('counterpartyId is required');
  if (!dateTimeKst) throw new Error('dateTimeKst is required');
  if (!Number.isInteger(amountKrw) || amountKrw <= 0) throw new Error('amountKrw must be a positive integer');

  const cp = findCounterpartyById_(counterpartyId);
  if (!cp) throw new Error('counterparty not found');

  if (type === 'received' && cp.category !== 'tutee') {
    throw new Error('received transactions require tutee category');
  }
  if (type === 'spent' && cp.category !== 'merchant') {
    throw new Error('spent transactions require merchant category');
  }

  const id = Utilities.getUuid();
  const now = new Date();
  const timestampUtc = now.toISOString();
  const createdAtKst = Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm:ss');

  const sheet = getSheet_(SHEET_TRANSACTIONS);
  sheet.appendRow([
    id,
    timestampUtc,
    createdAtKst,
    dateTimeKst,
    type,
    person,
    counterpartyId,
    cp.name,
    cp.category,
    amountKrw,
    description,
  ]);

  return { id };
}

function getDashboard_() {
  const txSheet = getSheet_(SHEET_TRANSACTIONS);
  const values = txSheet.getDataRange().getValues();
  if (values.length < 2) {
    return {
      dashboard: {
        totalCash: 0,
        monthReceived: 0,
        monthSpent: 0,
      },
    };
  }

  const monthKey = Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  const header = values[0];
  const rows = values.slice(1).filter(r => String(r[0]).trim() !== '');

  let totalReceived = 0;
  let totalSpent = 0;
  let monthReceived = 0;
  let monthSpent = 0;

  rows.forEach(row => {
    const type = String(row[header.indexOf('type')] || '');
    const amount = Number(row[header.indexOf('amount_krw')] || 0);
    const txKst = String(row[header.indexOf('transaction_datetime_kst')] || '');

    if (type === 'received') totalReceived += amount;
    if (type === 'spent') totalSpent += amount;

    if (txKst.slice(0, 7) === monthKey) {
      if (type === 'received') monthReceived += amount;
      if (type === 'spent') monthSpent += amount;
    }
  });

  return {
    dashboard: {
      totalCash: totalReceived - totalSpent,
      monthReceived: monthReceived,
      monthSpent: monthSpent,
    },
  };
}

function findCounterpartyById_(counterpartyId) {
  const list = listCounterparties_().counterparties;
  return list.find(cp => cp.id === counterpartyId && cp.active === true) || null;
}

function formatKstNow_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
}

function normalizeText_(v) {
  return String(v || '').trim();
}
