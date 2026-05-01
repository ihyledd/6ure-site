"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

const CATEGORIES = [
  "Adobe After Effects",
  "Adobe Premiere Pro",
  "Adobe Photoshop",
  "Alight Motion",
  "CapCut",
  "Sony Vegas Pro",
  "Davinci Resolve",
  "Video Star",
  "Topaz Labs",
  "Other",
];

type Props = {
  userName: string;
  userAvatar: string | null;
};

export function ResourceUploadClient({ userName, userAvatar }: Props) {
  const [step, setStep] = useState<1 | 2>(1); // 1 = Details, 2 = Review
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [editorName, setEditorName] = useState("");
  const [editorSocialUrl, setEditorSocialUrl] = useState("");
  const [category, setCategory] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [placeUrl, setPlaceUrl] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("");
  const [priceNumeric, setPriceNumeric] = useState("");
  const [fileSizeMb, setFileSizeMb] = useState(""); // user enters in MB; we convert to bytes

  // Creator enrichment (profile pic from TikTok/YouTube)
  const [creatorAvatar, setCreatorAvatar] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [creatorFetching, setCreatorFetching] = useState(false);
  const enrichTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  // Debounced creator enrichment
  const handleSocialUrlChange = useCallback((url: string) => {
    setEditorSocialUrl(url);
    setCreatorAvatar(null);
    setCreatorName(null);

    if (enrichTimer.current) clearTimeout(enrichTimer.current);

    const trimmed = url.trim();
    if (!trimmed || !trimmed.startsWith("http")) return;

    // Only fetch for TikTok/YouTube
    const host = (() => { try { return new URL(trimmed).hostname.toLowerCase(); } catch { return ""; } })();
    const isTikTok = host.includes("tiktok.com");
    const isYouTube = host.includes("youtube.com") || host.includes("youtu.be");
    if (!isTikTok && !isYouTube) return;

    enrichTimer.current = setTimeout(async () => {
      setCreatorFetching(true);
      try {
        const res = await fetch("/api/resources/enrich-creator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = await res.json();
        if (data.avatar) setCreatorAvatar(data.avatar);
        if (data.name && !editorName.trim()) setEditorName(data.name);
        if (data.name) setCreatorName(data.name);
      } catch { /* ignore */ }
      setCreatorFetching(false);
    }, 800);
  }, [editorName]);

  // Debounced product enrichment
  const handleProductUrlChange = useCallback((url: string) => {
    setPlaceUrl(url);
    if (productTimer.current) clearTimeout(productTimer.current);

    const trimmed = url.trim();
    if (!trimmed || !trimmed.startsWith("http")) return;

    productTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/resources/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = await res.json();
        if (data.thumbnail && !thumbnailUrl) setThumbnailUrl(data.thumbnail);
        if (data.title && !name.trim()) setName(data.title);
        if (data.price && !price) setPrice(data.price);
        if (data.priceNumeric != null && !priceNumeric) setPriceNumeric(String(data.priceNumeric));
      } catch { /* ignore — manual thumbnail entry remains available as fallback */ }
    }, 800);
  }, [name, thumbnailUrl, price, priceNumeric]);

  // Validation
  const isValid = name.trim() && editorName.trim() && category && filePath.trim() && placeUrl.trim();

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/resources/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          editor_name: editorName.trim(),
          editor_social_url: editorSocialUrl.trim() || null,
          category,
          file_path: filePath.trim(),
          thumbnail_url: thumbnailUrl.trim(),
          is_premium: isPremium,
          place_url: placeUrl.trim() || null,
          tags: tags.trim() || null,
          price: price.trim() || null,
          price_numeric: priceNumeric.trim() ? Number(priceNumeric) : null,
          file_size_bytes: fileSizeMb.trim() ? Math.round(Number(fileSizeMb) * 1024 * 1024) : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess({ id: data.id });
      } else {
        setError(data.error || "Upload failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  // ─── Success state ───
  if (success) {
    return (
      <div className="res-upload" style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
        <div className="res-upload-success">
          <div className="res-upload-success-icon">
            <i className="bi bi-check-circle-fill" />
          </div>
          <h2>Resource Uploaded!</h2>
          <p>Your resource has been published successfully.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <Link href={`/resources/${success.id}`} className="res-upload-btn-primary">
              View Resource
            </Link>
            <button
              className="res-upload-btn-secondary"
              onClick={() => {
                setSuccess(null);
                setStep(1);
                setName("");
                setEditorName("");
                setEditorSocialUrl("");
                setCreatorAvatar(null);
                setCreatorName(null);
                setCategory("");
                setIsPremium(false);
                setFilePath("");
                setThumbnailUrl("");
                setPlaceUrl("");
                setTags("");
                setPrice("");
                setPriceNumeric("");
                setFileSizeMb("");
              }}
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="res-upload" style={{ maxWidth: 800, margin: "0 auto", padding: "24px 24px 80px" }}>
      {/* Header */}
      <Link href="/resources" className="res-detail-back">
        <i className="bi bi-arrow-left" /> Back to Resources
      </Link>

      <div className="res-upload-header">
        <h1 className="res-upload-title">
          <i className="bi bi-cloud-arrow-up" /> Upload Resource
        </h1>
        <p className="res-upload-subtitle">
          Share creative resources with the community
        </p>
      </div>

      {/* Info banner */}
      <div className="res-upload-banner">
        <i className="bi bi-info-circle" />
        <div>
          <strong>Files must be uploaded separately</strong> — Upload files to{" "}
          <a href="https://files.6ureleaks.com" target="_blank" rel="noopener noreferrer">
            files.6ureleaks.com
          </a>{" "}
          and use <code>/cloud move all</code> in Discord. Then enter the cloud path below.
        </div>
      </div>

      {/* Steps indicator */}
      <div className="res-upload-steps">
        <div className={`res-upload-step ${step >= 1 ? "active" : ""}`}>
          <span className="res-upload-step-num">1</span>
          <span>Details</span>
        </div>
        <div className="res-upload-step-line" />
        <div className={`res-upload-step ${step >= 2 ? "active" : ""}`}>
          <span className="res-upload-step-num">2</span>
          <span>Review</span>
        </div>
      </div>

      {/* ─── Step 1: Details ─── */}
      {step === 1 && (
        <div className="res-upload-form">
          {/* Name */}
          <div className="res-upload-field">
            <label className="res-upload-label">
              Resource Name <span className="res-upload-req">*</span>
            </label>
            <input
              type="text"
              className="res-upload-input"
              placeholder="e.g. NAVY VELOCITY EDITING PACK"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Creator Social URL */}
          <div className="res-upload-field">
            <label className="res-upload-label">
              Creator Social URL
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="res-upload-input"
                placeholder="https://tiktok.com/@username or YouTube channel URL"
                value={editorSocialUrl}
                onChange={(e) => handleSocialUrlChange(e.target.value)}
                style={{ paddingRight: creatorAvatar ? 46 : undefined }}
              />
              {/* Live avatar preview */}
              {creatorFetching && (
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                  <span className="res-detail-spinner" style={{ width: 20, height: 20 }} />
                </div>
              )}
              {creatorAvatar && !creatorFetching && (
                <img
                  src={creatorAvatar}
                  alt=""
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    width: 30, height: 30, borderRadius: "50%", objectFit: "cover",
                    border: "2px solid var(--discord-blurple)",
                  }}
                />
              )}
            </div>
            <span className="res-upload-hint">TikTok or YouTube — auto-fills creator name & avatar</span>
            {creatorName && creatorAvatar && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginTop: 8,
                padding: "8px 12px", background: "rgba(88, 101, 242, 0.08)",
                border: "1px solid rgba(88, 101, 242, 0.2)", borderRadius: 10,
                fontSize: 13, color: "var(--text-secondary)"
              }}>
                <img src={creatorAvatar} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />
                <span>Found: <strong>{creatorName}</strong></span>
              </div>
            )}
          </div>

          {/* Editor Name */}
          <div className="res-upload-field">
            <label className="res-upload-label">
              Editor / Creator Name <span className="res-upload-req">*</span>
            </label>
            <input
              type="text"
              className="res-upload-input"
              placeholder="e.g. n4vy.fx"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
            />
          </div>

          {/* Two-column row */}
          <div className="res-upload-row">
            {/* Category */}
            <div className="res-upload-field" ref={catRef}>
              <label className="res-upload-label">
                Category <span className="res-upload-req">*</span>
              </label>
              <button
                type="button"
                className="res-upload-select"
                onClick={() => setCatOpen(!catOpen)}
              >
                <span style={{ opacity: category ? 1 : 0.5 }}>
                  {category || "Select Category"}
                </span>
                <i className={`bi bi-chevron-${catOpen ? "up" : "down"}`} />
              </button>
              {catOpen && (
                <div className="res-upload-dropdown">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`res-upload-dropdown-item ${category === c ? "active" : ""}`}
                      onClick={() => {
                        setCategory(c);
                        setCatOpen(false);
                      }}
                    >
                      {c}
                      {category === c && <i className="bi bi-check2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Type */}
            <div className="res-upload-field">
              <label className="res-upload-label">
                Upload Type <span className="res-upload-req">*</span>
              </label>
              <div className="res-upload-toggle-row">
                <button
                  type="button"
                  className={`res-upload-toggle-btn ${!isPremium ? "active" : ""}`}
                  onClick={() => setIsPremium(false)}
                >
                  Free
                </button>
                <button
                  type="button"
                  className={`res-upload-toggle-btn premium ${isPremium ? "active" : ""}`}
                  onClick={() => setIsPremium(true)}
                >
                  ⭐ Premium
                </button>
              </div>
            </div>
          </div>

          {/* File Path */}
          <div className="res-upload-field">
            <label className="res-upload-label">
              Cloud File Path <span className="res-upload-req">*</span>
            </label>
            <input
              type="text"
              className="res-upload-input"
              placeholder="e.g. N4VY.FX/NAVY VELOCITY PACK"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
            />
            <span className="res-upload-hint">
              Path on the cloud after using <code>/cloud move all</code>
            </span>
          </div>

          {/* Thumbnail URL */}
          <div className="res-upload-field">
            <label className="res-upload-label">
              Thumbnail URL <span style={{ fontWeight: "normal", color: "var(--text-tertiary)", fontSize: 12 }}>(Optional if Product Link auto-fetches)</span>
            </label>
            <input
              type="text"
              className="res-upload-input"
              placeholder="https://images.6ureleaks.com/gen/example.png"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
            />
          </div>

          {/* Thumbnail preview */}
          {thumbnailUrl && (
            <div className="res-upload-thumb-preview">
              <img
                src={thumbnailUrl}
                alt="Thumbnail preview"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* Tags */}
          <div className="res-upload-field">
            <label className="res-upload-label">Tags</label>
            <input
              type="text"
              className="res-upload-input"
              placeholder="ae, presets, creator"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <span className="res-upload-hint">Comma-separated tags for search</span>
          </div>

          {/* Price + file size — used for monthly payout scoring */}
          <div className="res-upload-row">
            <div className="res-upload-field">
              <label className="res-upload-label">
                Price (display)
              </label>
              <input
                type="text"
                className="res-upload-input"
                placeholder="$9.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <span className="res-upload-hint">As listed on the original store. Auto-fills from product link when possible.</span>
            </div>
            <div className="res-upload-field">
              <label className="res-upload-label">
                Price (EUR numeric)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="res-upload-input"
                placeholder="9.50"
                value={priceNumeric}
                onChange={(e) => setPriceNumeric(e.target.value)}
              />
              <span className="res-upload-hint">Used in payout scoring (35% weight).</span>
            </div>
            <div className="res-upload-field">
              <label className="res-upload-label">
                File size (MB)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                className="res-upload-input"
                placeholder="250"
                value={fileSizeMb}
                onChange={(e) => setFileSizeMb(e.target.value)}
              />
              <span className="res-upload-hint">Used in payout scoring (15% weight).</span>
            </div>
          </div>

          {/* Original source */}
          <div className="res-upload-field">
            <label className="res-upload-label">
              Product Link <span className="res-upload-req">*</span>
            </label>
            <input
              type="text"
              className="res-upload-input"
              placeholder="https://payhip.com/..."
              value={placeUrl}
              onChange={(e) => handleProductUrlChange(e.target.value)}
            />
          </div>

          {/* Next button */}
          <button
            className="res-upload-btn-primary"
            disabled={!isValid}
            onClick={() => setStep(2)}
            style={{ width: "100%", marginTop: 8 }}
          >
            Next: Review <i className="bi bi-arrow-right" />
          </button>
        </div>
      )}

      {/* ─── Step 2: Review ─── */}
      {step === 2 && (
        <div className="res-upload-form">
          <div className="res-upload-review-card">
            {/* Preview thumbnail */}
            {thumbnailUrl && (
              <div className="res-upload-review-thumb">
                <img src={thumbnailUrl} alt={name} />
                {isPremium && (
                  <span className="res-detail-premium-badge">
                    <i className="bi bi-star-fill" /> Premium
                  </span>
                )}
              </div>
            )}

            <h2 className="res-upload-review-title">{name}</h2>

            <div className="res-upload-review-meta">
              <div className="res-upload-review-row">
                <span className="res-upload-review-key">Editor</span>
                <span className="res-upload-review-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {creatorAvatar && <img src={creatorAvatar} alt="" style={{ width: 18, height: 18, borderRadius: "50%" }} />}
                  {editorName}
                </span>
              </div>
              <div className="res-upload-review-row">
                <span className="res-upload-review-key">Category</span>
                <span className="res-upload-review-val">{category}</span>
              </div>
              <div className="res-upload-review-row">
                <span className="res-upload-review-key">Type</span>
                <span className={`res-upload-review-val ${isPremium ? "text-premium" : "text-free"}`}>
                  {isPremium ? "⭐ Premium" : "Free"}
                </span>
              </div>
              <div className="res-upload-review-row">
                <span className="res-upload-review-key">File Path</span>
                <span className="res-upload-review-val" style={{ fontFamily: "monospace", fontSize: 12 }}>{filePath}</span>
              </div>
              {placeUrl && (
                <div className="res-upload-review-row">
                  <span className="res-upload-review-key">Source</span>
                  <span className="res-upload-review-val" style={{ fontSize: 12 }}>{placeUrl}</span>
                </div>
              )}
              {tags && (
                <div className="res-upload-review-row">
                  <span className="res-upload-review-key">Tags</span>
                  <span className="res-upload-review-val">{tags}</span>
                </div>
              )}
              {(price || priceNumeric) && (
                <div className="res-upload-review-row">
                  <span className="res-upload-review-key">Price</span>
                  <span className="res-upload-review-val">
                    {price}{price && priceNumeric ? " " : ""}{priceNumeric ? `(\u20ac${priceNumeric})` : ""}
                  </span>
                </div>
              )}
              {fileSizeMb && (
                <div className="res-upload-review-row">
                  <span className="res-upload-review-key">File size</span>
                  <span className="res-upload-review-val">{fileSizeMb} MB</span>
                </div>
              )}
              <div className="res-upload-review-row">
                <span className="res-upload-review-key">Uploaded by</span>
                <span className="res-upload-review-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {userAvatar && <img src={userAvatar} alt="" style={{ width: 18, height: 18, borderRadius: "50%" }} />}
                  {userName}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="res-upload-error">
              <i className="bi bi-exclamation-triangle" /> {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              className="res-upload-btn-secondary"
              onClick={() => setStep(1)}
              style={{ flex: 1 }}
            >
              <i className="bi bi-arrow-left" /> Back
            </button>
            <button
              className="res-upload-btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ flex: 2 }}
            >
              {submitting ? (
                <>
                  <span className="res-detail-spinner" />
                  Publishing...
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-arrow-up" /> Publish Resource
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="res-upload-tips">
        <h3><i className="bi bi-lightbulb" /> Quick Tips</h3>
        <div className="res-upload-tips-grid">
          <div className="res-upload-tip">
            <strong><i className="bi bi-link-45deg" /> File Paths</strong>
            <span>Use the exact path from the cloud, e.g. <code>EDITOR/PACK NAME</code></span>
          </div>
          <div className="res-upload-tip">
            <strong><i className="bi bi-image" /> Thumbnails</strong>
            <span>Upload thumbnails to images.6ureleaks.com for best results</span>
          </div>
          <div className="res-upload-tip">
            <strong><i className="bi bi-tags" /> Smart Tags</strong>
            <span>Add relevant tags to improve searchability</span>
          </div>
          <div className="res-upload-tip">
            <strong><i className="bi bi-star" /> Premium Content</strong>
            <span>Mark premium resources for exclusive access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
