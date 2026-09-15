"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

export function PoojaRequestForm() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const dateInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (dateInput.current) dateInput.current.min = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("submitting");
    try {
      const response = await fetch("/api/pooja-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), date: data.get("date"), plot: data.get("plot"), phone: data.get("phone"), website: data.get("website") }),
      });
      const result = await response.json().catch(() => null);
      if (response.status === 503) throw new Error("Pooja requests are not connected yet. Please contact the committee.");
      if (response.status === 400) throw new Error("Please check your name, plot number, phone number and date (today or later).");
      if (!response.ok || result?.ok !== true) throw new Error("Request failed");
      form.reset();
      setStatus("success");
      window.dispatchEvent(new Event("pooja-request-saved"));
    } catch (cause) {
      setError(cause instanceof Error && cause.message !== "Request failed" ? cause.message : "We couldn’t save your request. Please try again or contact the committee.");
      setStatus("error");
    }
  }
  return (
    <form className="panel contact-form" onSubmit={submit} aria-busy={status === "submitting"}>
      <h2>Request a pooja date</h2>
      <p className="muted">Your name, plot number, phone number and requested date will be saved in the community’s Google Sheet so the committee can contact you and confirm the schedule. Anyone with access to that sheet may be able to see these details.</p>
      <div className="contact-honeypot" aria-hidden="true">
        <label htmlFor="pooja-website">Website</label>
        <input id="pooja-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label>Member name
        <input name="name" autoComplete="name" minLength={2} maxLength={100} required placeholder="Enter your name" disabled={status === "submitting"} />
      </label>
      <label>Requested pooja date
        <input ref={dateInput} name="date" type="date" required disabled={status === "submitting"} />
      </label>
      <label>Plot number
        <input name="plot" maxLength={50} required placeholder="e.g. 2-A/10" disabled={status === "submitting"} />
      </label>
      <label>Phone number
        <input name="phone" type="tel" autoComplete="tel" inputMode="tel" minLength={7} maxLength={25} required placeholder="Enter your phone number" disabled={status === "submitting"} />
      </label>
      <button className="button primary" type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Submitting…" : "Submit pooja request"}</button>
      {status === "success" && <p className="form-feedback" role="status">Your request has been saved. The committee will confirm the pooja schedule.</p>}
      {status === "error" && <p className="form-feedback error" role="alert">{error}</p>}
    </form>
  );
}
