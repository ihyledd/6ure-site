import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSubmissionsByUserId } from "@/lib/dal/forms";
import { FormIcon, FORM_ICON_KEYS, type FormIconKey } from "@/lib/form-icons";
import { BiIcon } from "@/components/requests/BiIcon";
import { ApplyStatusError } from "./ApplyStatusError";
import "@/styles/protected-page.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Application Status",
  description: "View your application status",
};

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Strip erroneous " ? 0" or " 0" from form field labels (e.g. "Do you have any questions? 0" → "Do you have any questions?") */
function sanitizeFieldLabel(label: string): string {
  if (typeof label !== "string") return "";
  return label.replace(/\s*\?\s*0\s*$/, "?").replace(/\s+0\s*$/, "").trimEnd();
}

function parseThemeSafe(themeStr: string): { icon?: string } {
  if (!themeStr || typeof themeStr !== "string") return {};
  try {
    const parsed = JSON.parse(themeStr);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function parseAnswersSafe(answers: string): Record<string, string | string[]> {
  if (!answers || typeof answers !== "string") return {};
  try {
    const parsed = JSON.parse(answers);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export default async function ApplicationStatusPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/apply/status");

  let submissions;
  try {
    submissions = await getSubmissionsByUserId(session.user.id);
  } catch (err) {
    console.error("[apply/status] Failed to load submissions:", err);
    return <ApplyStatusError />;
  }

  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

  return (
    <div className="apply-page">
      <div className="apply-container">
        <Link href="/" className="apply-back-link">
          ← Back to home
        </Link>
        <section className="protected-hero apply-status-hero">
          <BiIcon name="clipboard-check" size={48} className="protected-hero-icon" aria-hidden />
          <h1>Application Status</h1>
          <p className="protected-hero-subtitle">
            View your application submissions and the responses you submitted.
          </p>
        </section>
        {submissions.length === 0 ? (
          <div className="apply-status-empty">
            <p>You haven&apos;t applied yet.</p>
            <p className="apply-status-empty-hint">Browse open forms and submit an application.</p>
            <div className="apply-status-actions">
              <Link href="/apply" className="apply-status-btn apply-status-btn-primary">
                Browse application forms →
              </Link>
              <Link href="/" className="apply-status-btn apply-status-btn-ghost">
                ← Back to home
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="apply-status-cards">
              {submissions.map((s) => {
                const allFields = [
                  ...(s.form.fields ?? []),
                  ...(s.form.sections ?? []).flatMap((sec) => sec.fields),
                ];
                const labelMap = new Map(allFields.map((f) => [f.id, f.label]));
                const orderedIds = allFields.map((f) => f.id);
                const answers = parseAnswersSafe(s.answers);
                const entries = [...orderedIds, ...Object.keys(answers).filter((k) => !orderedIds.includes(k))]
                  .filter((key) => {
                    const v = answers[key];
                    return v != null && (typeof v === "string" ? v : v.length) !== "";
                  })
                  .map((key) => ({
                    key,
                    label: sanitizeFieldLabel(labelMap.get(key) ?? formatLabel(key)),
                    value: (() => {
                      const v = answers[key];
                      return Array.isArray(v) ? v.join(", ") : String(v);
                    })(),
                  }));
                const theme = parseThemeSafe(s.form.theme);
                const iconKey = (FORM_ICON_KEYS.includes(theme?.icon as FormIconKey)
                  ? theme.icon
                  : "clipboard") as FormIconKey;
                return (
                  <div key={s.id} className="apply-status-card">
                    <div className="apply-status-card-header">
                      <div className="apply-status-card-icon">
                        <FormIcon icon={iconKey} size={24} />
                      </div>
                      <div className="apply-status-card-meta">
                        <span className="apply-status-card-title">{s.form.title}</span>
                        <span className={`apply-status-badge apply-status-badge-${s.status}`}>
                          {s.status}
                        </span>
                        <span className="apply-status-date">
                          {toDate(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {entries.length > 0 && (
                      <details className="apply-status-details">
                        <summary className="apply-status-summary">
                          <span className="apply-status-summary-inner">View your responses</span>
                        </summary>
                        <p className="apply-status-disclaimer">
                          Please do not share your responses with other applicants.
                        </p>
                        <div className="apply-status-answers">
                          {entries.map(({ key, label, value }) => (
                            <div key={key} className="apply-status-field">
                              <span className="apply-status-field-label">{label}</span>
                              <span className="apply-status-field-value">{value}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="apply-status-actions">
              <Link href="/apply" className="apply-status-btn apply-status-btn-primary">
                Apply to another form
              </Link>
              <Link href="/" className="apply-status-btn apply-status-btn-ghost">
                ← Back to home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
