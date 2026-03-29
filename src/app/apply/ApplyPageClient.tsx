"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRONOUNS_LIST } from "@/lib/pronouns";
import { Markdown } from "@/components/Markdown";
import { FormIcon, FORM_ICON_KEYS, type FormIconKey } from "@/lib/form-icons";
import { getDiscordLoginUrl } from "@/lib/auth-urls";

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function getTimezoneOffset(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(new Date());
    const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return offset || "GMT";
  } catch {
    return "";
  }
}

function formatTimezoneWithOffset(tz: string): string {
  const offset = getTimezoneOffset(tz);
  return offset ? `${tz} (${offset})` : tz;
}

function parseTimezoneValue(val: string): string {
  const m = val.match(/^(.+?)\s*\(GMT[+-]?\d+(?::\d+)?\)\s*$/);
  return m ? m[1].trim() : val.trim();
}

/** 12h → 24h for storage. */
function to24h(hour12: number, ampm: "AM" | "PM", minute: number): string {
  let h = hour12;
  if (ampm === "PM" && hour12 !== 12) h += 12;
  if (ampm === "AM" && hour12 === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** 24h → 12h for display. */
function from24h(v: string): { hour12: number; ampm: "AM" | "PM"; minute: number } {
  const [h = 0, m = 0] = (v || "00:00").split(":").map(Number);
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm: "AM" | "PM" = h < 12 ? "AM" : "PM";
  const minute = [0, 15, 30, 45].reduce((a, b) => (Math.abs(m - a) <= Math.abs(m - b) ? a : b));
  return { hour12, ampm, minute };
}

const MINUTES = [0, 15, 30, 45] as const;

function TimeInput12h({
  value,
  onChange,
  id,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  "aria-label"?: string;
}) {
  const { hour12, ampm, minute } = from24h(value || "12:00");
  return (
    <span className="apply-time-12h">
      <select
        id={id}
        value={hour12}
        onChange={(e) => onChange(to24h(Number(e.target.value), ampm, minute))}
        aria-label={ariaLabel}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="apply-time-12h-colon">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(to24h(hour12, ampm, Number(e.target.value)))}
        aria-label={ariaLabel ? `${ariaLabel} minutes` : undefined}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <select
        value={ampm}
        onChange={(e) => onChange(to24h(hour12, e.target.value as "AM" | "PM", minute))}
        aria-label={ariaLabel ? `${ariaLabel} AM/PM` : undefined}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </span>
  );
}

type Session = { user: { id: string; name: string | null; username?: string | null } } | null;

type FieldOption = { value: string; label: string; hasOther?: boolean };

type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
};

type Field = {
  id: string;
  type: string;
  label: string;
  description: string | null;
  required: boolean;
  placeholder: string | null;
  options: FieldOption[] | null;
  autoFill: string | null;
  scaleConfig: { min?: number; max?: number } | null;
  fileConfig: { maxSize?: number; allowedTypes?: string[] } | null;
  validation?: FieldValidation | null;
};

/** Strip erroneous trailing " ? 0" or " 0" from form field labels (display only). */
function sanitizeFieldLabel(label: string): string {
  if (typeof label !== "string") return "";
  return label
    .replace(/\s*\?\s*0\s*$/, "?")
    .replace(/\s+0\s*$/, "")
    .trimEnd();
}

type Section = {
  id: string;
  title: string | null;
  description: string | null;
  fields: Field[];
};

type Form = {
  id: string;
  title: string;
  description: string | null;
  confirmationMessage: string | null;
  minAge: number | null;
  fields: Field[];
  sections: Section[];
};

type Props = {
  formId: string | null;
  session: Session;
  initialForm?: Form | null;
  discordLoginUrl?: string;
};

function ApplyLoginPrompt({
  formId,
  formTitle,
  discordLoginUrl: discordLoginUrlProp,
}: {
  formId: string;
  formTitle: string;
  discordLoginUrl?: string;
}) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";
  const callbackUrl = `${origin}/apply?form=${formId}`;
  const loginUrl = discordLoginUrlProp ?? getDiscordLoginUrl(callbackUrl);

  return (
    <div className="apply-page">
      <div className="apply-container">
        <h1>{formTitle}</h1>
        <p>You must be logged in to submit this form.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          <a
            href={loginUrl}
            className="ure-btn-login"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start" }}
          >
            <DiscordIcon /> Log in to apply
          </a>
          <Link href="/apply" className="apply-link">
            ← Browse forms
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ApplyPageClient({ formId, session, initialForm, discordLoginUrl }: Props) {
  const [forms, setForms] = useState<{ id: string; title: string; description: string | null }[]>([]);
  const [form, setForm] = useState<Form | null>(initialForm ?? null);
  const [loading, setLoading] = useState(!initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    if (initialForm) {
      setForm(initialForm);
      setLoading(false);
      return;
    }
    if (formId) {
      fetch(`/api/forms/${formId}`)
        .then((r) => r.json())
        .then((d) => {
          setForm(d.form ?? null);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      fetch("/api/forms")
        .then((r) => r.json())
        .then((d) => {
          setForms(d.forms ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [formId, initialForm]);

  const setAnswer = (fieldId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validate = (): string | null => {
    if (!form) return "Form not loaded.";
    const allFields = [...form.fields, ...form.sections.flatMap((s) => s.fields)];
    const v = (field: Field) => answers[field.id];
    for (const f of allFields) {
      if (f.type === "SECTION_HEADER") continue;
      if (f.required) {
        const val = v(f);
        if (f.type === "TIME_RANGES") {
          const arr = Array.isArray(val) ? val : typeof val === "string" ? [val] : [];
          const hasComplete = arr.some(
            (s) => typeof s === "string" && s !== "-" && s.includes("-")
          );
          if (!hasComplete) {
            return `"${f.label}" is required. Add at least one time range.`;
          }
        } else if (
          val == null ||
          (typeof val === "string" && !val.trim()) ||
          (Array.isArray(val) && val.length === 0)
        ) {
          return `"${f.label}" is required.`;
        }
      }
      const val = v(f);
      const strVal = typeof val === "string" ? val : Array.isArray(val) ? val.join("") : "";
      const numVal = parseInt(String(val ?? ""), 10);
      const vld = f.validation;
      if (vld?.minLength != null && strVal.length < vld.minLength) {
        return `"${f.label}" must be at least ${vld.minLength} characters.`;
      }
      if (vld?.maxLength != null && strVal.length > vld.maxLength) {
        return `"${f.label}" must be at most ${vld.maxLength} characters.`;
      }
      if ((f.type === "NUMBER" || f.type === "AGE") && vld) {
        if (!Number.isNaN(numVal)) {
          if (vld.min != null && numVal < vld.min) {
            return `"${f.label}" must be at least ${vld.min}.`;
          }
          if (vld.max != null && numVal > vld.max) {
            return `"${f.label}" must be at most ${vld.max}.`;
          }
        }
      }
      const minAge = form.minAge != null ? Number(form.minAge) : null;
      const isAgeField = f.type === "AGE" || f.label.toLowerCase().includes("how old") || f.id === "age" || f.id === "Age";
      if (minAge != null && minAge > 0 && isAgeField) {
        const ageVal = typeof val === "number" ? val : numVal;
        if (Number.isNaN(ageVal) || ageVal < minAge) {
          return `You must be at least ${minAge} years old.`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!session) {
      setError("You must be logged in to apply.");
      return;
    }
    if (!form) return;
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    const allFields = [...form.fields, ...form.sections.flatMap((s) => s.fields)];
    const normalizedAnswers = { ...answers };
    for (const f of allFields) {
      if (f.type === "TIMEZONE" && normalizedAnswers[f.id]) {
        const v = normalizedAnswers[f.id];
        if (typeof v === "string") {
          normalizedAnswers[f.id] = parseTimezoneValue(v);
        }
      }
      if (f.type === "TIME_RANGES" && normalizedAnswers[f.id]) {
        const v = normalizedAnswers[f.id];
        const arr = Array.isArray(v) ? v : [v];
        normalizedAnswers[f.id] = arr.filter(
          (s) => typeof s === "string" && s !== "-" && s.includes("-")
        );
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: form.id, answers: normalizedAnswers }),
      });
      const text = await res.text();
      let data: { error?: string; confirmationMessage?: string } = {};
      if (text.trim()) {
        try {
          data = JSON.parse(text) as { error?: string; confirmationMessage?: string };
        } catch {
          setError(
            res.ok
              ? "Invalid response from server. Please try again."
              : `Submission failed (${res.status}). Please try again.`
          );
          setSubmitting(false);
          return;
        }
      }
      if (res.ok) {
        setSuccess(data.confirmationMessage ?? "Thank you for your application.");
      } else {
        setError(data.error ?? "Submission failed.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="apply-page">
        <div className="apply-container">
          <p style={{ color: "var(--text-tertiary)" }}>Loading…</p>
        </div>
      </div>
    );

  if (!formId && forms.length === 0)
    return (
      <div className="apply-page">
        <div className="apply-container">
          <h1>Apply</h1>
          <p>No application forms are currently open.</p>
          <Link href="/" className="apply-link">
            ← Back to home
          </Link>
        </div>
      </div>
    );

  if (!formId)
    return (
      <div className="apply-page">
        <div className="apply-container">
          <h1>Apply</h1>
          <div className="apply-form-cards">
            {forms.map((f) => {
              const theme = (f as { theme?: { icon?: string } }).theme ?? {};
              const iconKey = (FORM_ICON_KEYS.includes(theme?.icon as FormIconKey)
                ? theme.icon
                : "clipboard") as FormIconKey;
              return (
                <Link
                  key={f.id}
                  href={`/apply?form=${f.id}`}
                  className="apply-form-card"
                >
                  <div className="apply-form-card-icon">
                    <FormIcon icon={iconKey} size={32} />
                  </div>
                  <div className="apply-form-card-body">
                    <h3 className="apply-form-card-title">{f.title}</h3>
                  </div>
                  <span className="apply-form-card-arrow">→</span>
                </Link>
              );
            })}
          </div>
          <Link href="/" className="apply-link" style={{ marginTop: 24 }}>
            ← Back to home
          </Link>
        </div>
      </div>
    );

  if (!form)
    return (
      <div className="apply-page">
        <div className="apply-container">
          <p>Form not found.</p>
          <Link href="/apply" className="apply-link">
            ← Browse forms
          </Link>
        </div>
      </div>
    );

  if (success)
    return (
      <div className="apply-page">
        <div className="apply-container apply-success">
          <h1>Application submitted</h1>
          <p>{success}</p>
          <Link href="/apply" className="apply-link">
            View other forms
          </Link>
          <Link href="/" className="apply-link">
            ← Back to home
          </Link>
        </div>
      </div>
    );

  if (!session) {
    return (
      <ApplyLoginPrompt formId={form.id} formTitle={form.title} discordLoginUrl={discordLoginUrl} />
    );
  }

  const allFields = [...form.fields, ...form.sections.flatMap((s) => s.fields)];

  return (
    <div className="apply-page">
      <div className="apply-container">
        <h1>{form.title}</h1>

        <form onSubmit={handleSubmit} className="apply-form">
          {form.fields.map((field) => (
            <ApplyField
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={(v) => setAnswer(field.id, v)}
              username={session.user.username ?? session.user.name}
              userId={session.user.id}
            />
          ))}
          {form.sections.map((section) => (
            <div key={section.id} className="apply-section">
              {section.title && <h3>{section.title}</h3>}
              {section.fields.map((field) => (
                <ApplyField
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  onChange={(v) => setAnswer(field.id, v)}
                  username={session.user.username ?? session.user.name}
                  userId={session.user.id}
                />
              ))}
            </div>
          ))}
          {error && <p className="apply-error">{error}</p>}
          <button type="submit" className="apply-submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
        <Link href="/apply" className="apply-link" style={{ marginTop: 16 }}>
          ← Browse forms
        </Link>
      </div>
    </div>
  );
}

function ApplyField({
  field,
  value,
  onChange,
  username,
  userId,
}: {
  field: Field;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  username: string | null;
  userId: string;
}) {
  if (field.type === "SECTION_HEADER") return null;

  const id = `apply-${field.id}`;
  const val = value ?? "";
  const opts = (field.options ?? []) as FieldOption[];
  const displayLabel = sanitizeFieldLabel(field.label);

  if (field.autoFill === "username") {
    return (
      <div key={field.id} className="apply-field">
        <label htmlFor={id}>{displayLabel}</label>
        <input id={id} type="text" value={username ?? ""} readOnly disabled />
      </div>
    );
  }
  if (field.autoFill === "user_id") {
    return (
      <div key={field.id} className="apply-field">
        <label htmlFor={id}>{displayLabel}</label>
        <input id={id} type="text" value={userId} readOnly disabled />
        {field.description && <span className="apply-field-help">{field.description}</span>}
      </div>
    );
  }

  switch (field.type) {
    case "SHORT_TEXT":
    case "EMAIL":
    case "URL":
    case "PHONE":
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <input
            id={id}
            type={field.type === "EMAIL" ? "email" : field.type === "URL" ? "url" : "text"}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            required={field.required}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
          />
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "PARAGRAPH":
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <textarea
            id={id}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            required={field.required}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            rows={4}
          />
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "NUMBER":
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <input
            id={id}
            type="number"
            value={typeof val === "string" ? val : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
          />
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "AGE":
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <input
            id={id}
            type="number"
            min={field.validation?.min ?? 1}
            max={field.validation?.max ?? 120}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            required={field.required}
          />
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "DATE":
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <input
            id={id}
            type="date"
            value={typeof val === "string" ? val : ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "TIME":
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <TimeInput12h
            id={id}
            value={typeof val === "string" ? val : ""}
            onChange={(v) => onChange(v)}
            aria-label={displayLabel}
          />
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "TIME_RANGES": {
      const raw = Array.isArray(val) ? val : typeof val === "string" && val ? [val] : [];
      const parse = (s: string) => {
        const [a, b] = String(s).split("-");
        return { start: (a ?? "").trim(), end: (b ?? "").trim() };
      };
      const ranges = raw.map(parse);
      const ensureOne = ranges.length === 0 ? [{ start: "", end: "" }] : ranges;
      const toStorage = (rs: { start: string; end: string }[]) =>
        rs.map((r) => (r.start || r.end ? `${r.start}-${r.end}` : "-"));
      const updateRanges = (next: { start: string; end: string }[]) => {
        onChange(toStorage(next));
      };
      const setRange = (i: number, start: string, end: string) => {
        const next = [...ensureOne];
        next[i] = { start, end };
        updateRanges(next);
      };
      const addRange = () => updateRanges([...ensureOne, { start: "", end: "" }]);
      const removeRange = (i: number) => updateRanges(ensureOne.filter((_, j) => j !== i));
      return (
        <div key={field.id} className="apply-field">
          <label>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <div className="apply-time-ranges">
            {ensureOne.map((r, i) => (
              <div key={i} className="apply-time-range-row">
                <TimeInput12h
                  value={r.start}
                  onChange={(v) => setRange(i, v, r.end)}
                  aria-label={`${displayLabel} - start time`}
                />
                <span className="apply-time-range-sep">–</span>
                <TimeInput12h
                  value={r.end}
                  onChange={(v) => setRange(i, r.start, v)}
                  aria-label={`${displayLabel} - end time`}
                />
                {ensureOne.length > 1 && (
                  <button
                    type="button"
                    className="apply-time-range-remove"
                    onClick={() => removeRange(i)}
                    aria-label="Remove time range"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="apply-time-range-add"
              onClick={addRange}
            >
              + Add another time range
            </button>
          </div>
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    }
    case "YES_NO":
      return (
        <div key={field.id} className="apply-field">
          <label>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <div className="apply-choices">
            <label>
              <input
                type="radio"
                name={field.id}
                value="yes"
                checked={val === "yes"}
                onChange={() => onChange("yes")}
                required={field.required}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name={field.id}
                value="no"
                checked={val === "no"}
                onChange={() => onChange("no")}
              />
              No
            </label>
          </div>
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "MULTIPLE_CHOICE":
      return (
        <div key={field.id} className="apply-field">
          <label>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <div className="apply-choices">
            {opts.map((o) => (
              <label key={o.value}>
                <input
                  type="radio"
                  name={field.id}
                  value={o.value}
                  checked={val === o.value}
                  onChange={() => onChange(o.value)}
                  required={field.required}
                />
                {o.label}
              </label>
            ))}
          </div>
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "CHECKBOXES":
      const arrVal = Array.isArray(val) ? val : typeof val === "string" && val ? [val] : [];
      return (
        <div key={field.id} className="apply-field">
          <label>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <div className="apply-choices">
            {opts.map((o) => (
              <label key={o.value}>
                <input
                  type="checkbox"
                  value={o.value}
                  checked={arrVal.includes(o.value)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...arrVal, o.value]
                      : arrVal.filter((x) => x !== o.value);
                    onChange(next);
                  }}
                />
                {o.label}
              </label>
            ))}
          </div>
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "MULTI_SELECT":
      const multiVal = Array.isArray(val) ? val : typeof val === "string" && val ? [val] : [];
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <select
            id={id}
            multiple
            size={Math.min(Math.max(opts.length, 4), 8)}
            value={multiVal}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value);
              onChange(selected);
            }}
            required={field.required && multiVal.length === 0}
            className="apply-multi-select"
          >
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="apply-field-help">Hold Ctrl/Cmd to select multiple</span>
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "DROPDOWN":
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <select
            id={id}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          >
            <option value="">Select…</option>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "LINEAR_SCALE":
    case "RATING": {
      const min = field.scaleConfig?.min ?? 1;
      const max = field.scaleConfig?.max ?? 5;
      return (
        <div key={field.id} className="apply-field">
          <label>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <div className="apply-scale">
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name={field.id}
                  value={String(n)}
                  checked={val === String(n)}
                  onChange={() => onChange(String(n))}
                  required={field.required}
                />
                {n}
              </label>
            ))}
          </div>
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    }
    case "TIMEZONE": {
      const timezones = Intl.supportedValuesOf("timeZone");
      const byRegion = timezones.reduce<Record<string, string[]>>((acc, tz) => {
        const region = tz.split("/")[0] ?? "Other";
        if (!acc[region]) acc[region] = [];
        acc[region].push(tz);
        return acc;
      }, {});
      const regionOrder = ["Africa", "America", "Antarctica", "Arctic", "Asia", "Atlantic", "Australia", "Europe", "Indian", "Pacific", "Other"];
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <select
            id={id}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          >
            <option value="">Select timezone…</option>
            {regionOrder.filter((r) => byRegion[r]?.length).map((region) => (
              <optgroup key={region} label={region}>
                {byRegion[region]!.map((tz) => (
                  <option key={tz} value={tz}>
                    {formatTimezoneWithOffset(tz)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    }
    case "PRONOUNS":
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <select
            id={id}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          >
            <option value="">Select…</option>
            {PRONOUNS_LIST.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    case "FILE_UPLOAD":
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <input
            id={id}
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                const reader = new FileReader();
                reader.onload = () => onChange(reader.result as string);
                reader.readAsDataURL(f);
              }
            }}
            required={field.required}
          />
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
    default:
      return (
        <div key={field.id} className="apply-field">
          <label htmlFor={id}>
            {displayLabel} {field.required ? "*" : null}
          </label>
          <input
            id={id}
            type="text"
            value={typeof val === "string" ? val : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            required={field.required}
          />
          {field.description && <span className="apply-field-help">{field.description}</span>}
        </div>
      );
  }
}
