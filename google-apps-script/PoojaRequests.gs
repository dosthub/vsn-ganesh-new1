// Deploy in a SEPARATE Apps Script project from ContactForm.gs.
const POOJA_SPREADSHEET_ID = "1gfGm1bGOEE0IT1Kg97IGE1nsBfTxURS5NO7LfAZh-BY";
const POOJA_TAB_ID = 2009284977;

function doPost(event) {
  try {
    const body = JSON.parse(event.postData?.contents || "{}");
    const secret = PropertiesService.getScriptProperties().getProperty("POOJA_WEBHOOK_SECRET");
    if (!secret || body.secret !== secret) return reply({ ok: false });
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const plot = typeof body.plot === "string" ? body.plot.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!plot || plot.length > 50 || !/^\+?[0-9 ()-]{7,25}$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) return reply({ ok: false });
    const parsed = new Date(date + "T12:00:00Z");
    const today = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
    if (name.length < 2 || name.length > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < today) return reply({ ok: false });
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.openById(POOJA_SPREADSHEET_ID).getSheets().find(s => s.getSheetId() === POOJA_TAB_ID);
      if (!sheet) throw new Error("Target pooja tab missing");
      const headers = ["Member name", "Requested date", "Received at", "Status", "Plot number", "Phone number"];
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
        sheet.setFrozenRows(1);
      } else if (sheet.getRange(1, 1, 1, 4).getDisplayValues()[0].join("|") === headers.slice(0, 4).join("|") && sheet.getLastColumn() === 4) {
        sheet.getRange(1, 5, 1, 2).setValues([["Plot number", "Phone number"]]);
      } else if (sheet.getRange(1, 1, 1, 6).getDisplayValues()[0].join("|") !== headers.join("|")) {
        throw new Error("Target tab headers do not match; no row written");
      }
      sheet.appendRow([/^[=+\-@]/.test(name) ? "'" + name : name, "'" + date, new Date(), "Requested", "'" + plot, "'" + phone]);
    } finally {
      lock.releaseLock();
    }
    return reply({ ok: true });
  } catch (error) {
    console.error(error);
    return reply({ ok: false });
  }
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
