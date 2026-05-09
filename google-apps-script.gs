const SHEET_NAME = "Watch Intake";
const SPREADSHEET_ID = "1i2-aHGXF43c0v11XGrzyuWxwFyZPSObGEiODbPBAqVw";

const HEADERS = [
  "Order ID",
  "Submitted At",
  "Customer Name",
  "Phone",
  "Email",
  "Preferred Contact Method",
  "Brand",
  "Model",
  "Serial Number",
  "Watch Type",
  "Requested Service",
  "Priority",
  "Estimated Value",
  "Date Received",
  "Promised Date",
  "Accessories Received",
  "Reported Issue",
  "Visual Condition Notes",
  "Internal Notes",
  "Terms Accepted",
  "Service Status"
];

const PUBLIC_FIELD_MAP = {
  "Order ID": "orderId",
  "Customer Name": "customerName",
  "Phone": "phone",
  "Email": "email",
  "Brand": "brand",
  "Model": "model",
  "Requested Service": "serviceType",
  "Promised Date": "promisedDate",
  "Accessories Received": "accessories",
  "Reported Issue": "issueDescription",
  "Service Status": "serviceStatus"
};

function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    ensureHeaders(sheet);

    const data = e.parameter || {};
    sheet.appendRow([
      data.orderId || "",
      data.submittedAt || "",
      data.customerName || "",
      data.phone || "",
      data.email || "",
      data.contactMethod || "",
      data.brand || "",
      data.model || "",
      data.serialNumber || "",
      data.watchType || "",
      data.serviceType || "",
      data.priority || "",
      data.estimatedValue || "",
      data.dateReceived || "",
      data.promisedDate || "",
      data.accessories || "",
      data.issueDescription || "",
      data.conditionNotes || "",
      data.internalNotes || "",
      data.termsAccepted || "off",
      data.serviceStatus || "Received"
    ]);

    return jsonOutput({ success: true });
  } catch (error) {
    return jsonOutput({ success: false, message: error.message });
  }
}

function doGet(e) {
  const params = e.parameter || {};

  if (params.action === "track") {
    return trackingResponse(params);
  }

  return textOutput("Watch intake sync and service tracking are ready.");
}

function trackingResponse(params) {
  try {
    const sheet = getOrCreateSheet();
    ensureHeaders(sheet);

    const phone = normalizeContact(params.phone);

    if (!phone) {
      return callbackOutput(params, {
        success: false,
        message: "Enter the phone number used for service intake."
      });
    }

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const rows = values.slice(1);
    const phoneIndex = headers.indexOf("Phone");

    const matchedRows = rows.filter((row) => {
      const rowPhone = normalizeContact(row[phoneIndex]);
      return phoneMatches(rowPhone, phone);
    }).reverse();

    if (!matchedRows.length) {
      return callbackOutput(params, {
        success: false,
        message: "No service orders were found for this phone number."
      });
    }

    const orders = matchedRows.map((row) => {
      const order = {};
      headers.forEach((header, index) => {
        const publicKey = PUBLIC_FIELD_MAP[header];
        if (publicKey) {
          order[publicKey] = row[index] || "";
        }
      });

      order.serviceStatus = order.serviceStatus || "Received";
      return order;
    });

    return callbackOutput(params, {
      success: true,
      orders
    });
  } catch (error) {
    return callbackOutput(params, {
      success: false,
      message: error.message
    });
  }
}

function getOrCreateSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();

  if (sheet.getLastRow() === 0 || lastColumn === 0) {
    sheet.appendRow(HEADERS);
    return;
  }

  const existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  HEADERS.forEach((header) => {
    if (existingHeaders.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeContact(value) {
  return normalize(value).replace(/[\s()+-]/g, "");
}

function phoneMatches(storedPhone, lookupPhone) {
  if (!storedPhone || !lookupPhone) {
    return false;
  }

  return storedPhone === lookupPhone
    || storedPhone.endsWith(lookupPhone)
    || lookupPhone.endsWith(storedPhone);
}

function callbackOutput(params, payload) {
  if (params.callback) {
    return ContentService
      .createTextOutput(`${params.callback}(${JSON.stringify(payload)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return jsonOutput(payload);
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function textOutput(message) {
  return ContentService
    .createTextOutput(message)
    .setMimeType(ContentService.MimeType.TEXT);
}
