"use client";

import { useCallback, useEffect, useState } from "react";
import { parseCsv } from "@/lib/sheetCsv";
import { RecordsTable } from "@/components/common/RecordsTable";

type Entry = { name: string; date: string; status: string; plot: string };

export function PoojaSchedule() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/pooja-schedule/", { cache: "no-store", signal });
      const payload = await response.json();
      if (!response.ok || typeof payload.csv !== "string") throw new Error("Unavailable");
      const table = parseCsv(payload.csv);
      const rows = table.rows.map(row => ({ name: row[0]?.trim() || "", date: row[1]?.trim().replace(/^'/, "") || "", status: row[2]?.trim() || "Requested", plot: row[3]?.trim().replace(/^'/, "") || "—" }))
        .filter(row => row.name)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (!signal?.aborted) setEntries(rows);
      if (!signal?.aborted) setError(false);
    } catch {
      if (!signal?.aborted) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => void load(controller.signal), 0);
    const refresh = () => { setLoading(true); void load(controller.signal); };
    window.addEventListener("pooja-request-saved", refresh);
    return () => { window.clearTimeout(initialLoad); controller.abort(); window.removeEventListener("pooja-request-saved", refresh); };
  }, [load]);
  return (
    <section id="pooja-schedule" className="section-space panel">
      <h2>Members’ pooja schedule</h2>
      <p className="muted">Dates and member requests from the community sheet. Requests are awaiting committee confirmation unless marked Confirmed. Daily puja and evening aarti begin at 8 PM.</p>
      <button className="button secondary" type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading}>{loading ? "Loading…" : "Refresh schedule"}</button>
      <div className="section-space" aria-live="polite">
        {loading ? <p role="status">Loading the pooja schedule…</p> : error ? <p role="alert">We couldn’t load the pooja schedule. Please refresh to try again.</p> : entries.length ? (
          <RecordsTable caption="Pooja requests and confirmed dates" headers={["Requested date", "Member name", "Plot number", "Status"]} rows={entries.map(entry => [entry.date || "—", entry.name, entry.plot, entry.status])} />
        ) : <p>No pooja requests have been recorded yet.</p>}
      </div>
    </section>
  );
}
