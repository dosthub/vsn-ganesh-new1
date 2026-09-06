"use client";

import { FormEvent, useState } from "react";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });

      if (!response.ok) throw new Error("Message delivery failed");
      const result: unknown = await response.json();
      if (!result || typeof result !== "object" || !(result as { ok?: unknown }).ok) {
        throw new Error("Invalid response");
      }

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      className="panel contact-form"
      onSubmit={handleSubmit}
      aria-busy={status === "submitting"}
    >
      <h2>Leave a message</h2>
      <p className="muted" id="contact-form-note">
        Your name, email and message will be saved privately in the committee’s
        Google Sheet.
      </p>
      <div className="contact-honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <label>
        Your name
        <input
          name="name"
          autoComplete="name"
          required
          maxLength={100}
          placeholder="Enter your name"
          disabled={status === "submitting"}
        />
      </label>
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          disabled={status === "submitting"}
        />
      </label>
      <label>
        Message
        <textarea
          name="message"
          rows={5}
          minLength={10}
          maxLength={2000}
          required
          placeholder="How can the community committee help?"
          disabled={status === "submitting"}
        />
      </label>
      <button
        className="button primary"
        type="submit"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
      {status === "success" && (
        <p className="form-feedback" role="status">
          Thank you. Your message has been sent to the community committee.
        </p>
      )}
      {status === "error" && (
        <p className="form-feedback error" role="alert">
          We couldn’t send your message. Please try again in a moment.
        </p>
      )}
    </form>
  );
}
