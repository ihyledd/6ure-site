"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export function ContactButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="wiki-footer-col-link wiki-footer-contact-btn" onClick={() => setOpen(true)}>
        Suggest changes
      </button>
      {open && typeof document !== "undefined" &&
        createPortal(<ContactModalInner onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

export function ContactModalInner({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="contact-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="contact-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="contact-modal-header">
          <h2 className="contact-modal-title">Contact us</h2>
          <button type="button" className="contact-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {status === "sent" ? (
          <div className="contact-modal-body" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Message sent!</p>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Thank you. We&apos;ll get back to you soon.</p>
            <button type="button" className="btn-primary" onClick={onClose} style={{ marginTop: 20 }}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="contact-modal-body">
            <label className="contact-label">
              Full name
              <input type="text" value={form.name} onChange={update("name")} placeholder="Your name" required className="contact-input" />
            </label>
            <label className="contact-label">
              Email
              <input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required className="contact-input" />
            </label>
            <label className="contact-label">
              Message
              <textarea value={form.message} onChange={update("message")} placeholder="What would you like us to add or change?" required rows={4} className="contact-input contact-textarea" />
            </label>
            {status === "error" && (
              <p style={{ fontSize: 13, color: "var(--error)" }}>Something went wrong. Please try again.</p>
            )}
            <button type="submit" className="btn-primary" disabled={status === "sending"} style={{ width: "100%", marginTop: 4 }}>
              {status === "sending" ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
