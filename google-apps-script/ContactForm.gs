const CONTACT_SHEET_NAME = "ContactMessages";

function doPost(event) {
  try {
    const body = JSON.parse(event.postData?.contents || "{}");
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty("CONTACT_WEBHOOK_SECRET");
    const spreadsheetId = properties.getProperty("GOOGLE_SHEET_ID");

    if (!expectedSecret || body.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: "Unauthorized" });
    }
    if (!spreadsheetId) {
      return jsonResponse({ ok: false, error: "Missing spreadsheet configuration" });
    }

    const name = cleanText(body.name);
    const email = cleanText(body.email);
    const message = cleanText(body.message);

    if (
      name.length < 2 ||
      name.length > 100 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      message.length < 10 ||
      message.length > 2000
    ) {
      return jsonResponse({ ok: false, error: "Invalid form fields" });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      let sheet = spreadsheet.getSheetByName(CONTACT_SHEET_NAME);

      if (!sheet) {
        sheet = spreadsheet.insertSheet(CONTACT_SHEET_NAME);
        sheet.appendRow(["Received at", "Name", "Email", "Message", "Status"]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
      }

      sheet.appendRow([
        new Date(),
        safeCell(name),
        safeCell(email),
        safeCell(message),
        "New",
      ]);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: "Unable to save message" });
  }
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeCell(value) {
  return /^[=+\-@]/.test(value.trimStart()) ? "'" + value : value;
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
