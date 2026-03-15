"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDate, getDisplayName } from "@/lib/requests-utils";
import { UserAvatar } from "./UserAvatar";
import { MarkdownProse } from "@/components/Markdown";
import { BiIcon } from "./BiIcon";

export type CommentItem = {
  id: number;
  request_id: number;
  user_id: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  updated_at?: string;
  username: string;
  avatar: string | null;
  avatar_decoration?: string | null;
  patreon_premium?: boolean;
  is_staff?: boolean;
};

export interface CommentsProps {
  requestId: number;
  commentsLocked?: boolean;
  loginHref: string;
  /** When true, do not render the section header (parent provides it) */
  hideHeader?: boolean;
  /** When true, show Staff badge on staff comments (from dashboard Display settings) */
  showStaffBadge?: boolean;
}

function formatCooldown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildTree(comments: CommentItem[]): { top: CommentItem[]; byParent: Map<number, CommentItem[]> } {
  const top: CommentItem[] = [];
  const byParent = new Map<number, CommentItem[]>();
  for (const c of comments) {
    if (c.parent_id == null) top.push(c);
    else {
      const siblings = byParent.get(c.parent_id) ?? [];
      siblings.push(c);
      byParent.set(c.parent_id, siblings);
    }
  }
  return { top, byParent };
}

function ReplyForm({
  requestId,
  parentId,
  onSubmitted,
  onCancel,
}: {
  requestId: number;
  parentId: number;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch(`/api/comments/request/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), parent_id: parentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to post");
        return;
      }
      setContent("");
      onSubmitted();
    } finally {
      setPosting(false);
    }
  }

  return (
    <form className="comment-reply-form" onSubmit={submit}>
      <textarea
        className="comment-form-input"
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, 2000))}
        placeholder="Write a reply..."
        rows={2}
      />
      <div className="comment-reply-form-actions">
        <span className="comment-char-count">{content.length}/2000</span>
        {error && <span style={{ color: "var(--error, #ef4444)", fontSize: 13 }}>{error}</span>}
        <button type="button" className="comment-reply-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="comment-submit" disabled={posting || !content.trim()}>
          {posting ? "Posting..." : "Reply"}
        </button>
      </div>
    </form>
  );
}

function CommentCard({
  comment,
  isReply,
  requestId,
  sessionUserId,
  isStaff,
  showStaffBadge,
  commentsLocked,
  onDelete,
  onReplySuccess,
  onBanClick,
}: {
  comment: CommentItem;
  isReply: boolean;
  requestId: number;
  sessionUserId: string | undefined;
  isStaff: boolean;
  showStaffBadge: boolean;
  commentsLocked: boolean;
  onDelete: (id: number) => void;
  onReplySuccess: () => void;
  onBanClick?: (userId: string, username: string) => void;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const canDelete = sessionUserId && (comment.user_id === sessionUserId || isStaff);

  return (
    <div className={`comment ${isReply ? "comment-reply" : ""}`}>
      <UserAvatar
        avatar={comment.avatar}
        userId={comment.user_id}
        avatarDecoration={comment.avatar_decoration}
        size={isReply ? 32 : 40}
        displayName={getDisplayName(comment.username)}
        className="comment-avatar"
      />
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-username">{getDisplayName(comment.username)}</span>
          {isReply && <span className="comment-reply-label">reply</span>}
          {showStaffBadge && comment.is_staff ? (
            <span className="requests-card-badge requests-staff-badge-inline" title="Staff">
              <BiIcon name="shield-fill-check" size={10} /> Staff
            </span>
          ) : null}
          {comment.patreon_premium ? (
            <span className="requests-card-badge requests-premium-indicator" title="Premium">
              <BiIcon name="star-fill" size={10} />
            </span>
          ) : null}
          <span className="comment-time">{formatDate(comment.created_at)}</span>
        </div>
        <div className="comment-text">
          <MarkdownProse content={comment.content} className="requests-prose" />
        </div>
        <div className="comment-actions">
          {sessionUserId && !isReply && !commentsLocked && (
            <button
              type="button"
              className="comment-reply-btn"
              onClick={() => setShowReplyForm((o) => !o)}
            >
              <BiIcon name="reply" size={12} /> Reply
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="comment-delete"
              onClick={() => confirm("Are you sure you want to delete this comment?") && onDelete(comment.id)}
            >
              <BiIcon name="trash" size={12} /> Delete
            </button>
          )}
          {isStaff && sessionUserId && comment.user_id !== sessionUserId && onBanClick && (
            <button
              type="button"
              className="comment-ban-btn"
              onClick={() => onBanClick(comment.user_id, getDisplayName(comment.username))}
            >
              <BiIcon name="person-x" size={12} /> Ban from comments
            </button>
          )}
        </div>
        {showReplyForm && sessionUserId && (
          <ReplyForm
            requestId={requestId}
            parentId={comment.id}
            onSubmitted={() => {
              setShowReplyForm(false);
              onReplySuccess();
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        )}
      </div>
    </div>
  );
}

export function Comments({ requestId, commentsLocked, loginHref, hideHeader, showStaffBadge = false }: CommentsProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [error, setError] = useState("");
  const [banStatus, setBanStatus] = useState<{ banned: boolean; reason?: string; expires_at?: string } | null>(null);
  const [showBanModal, setShowBanModal] = useState<{ userId: string; username: string; reason?: string; durationDays?: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());

  const isStaff = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  useEffect(() => {
    fetch(`/api/comments/request/${requestId}`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [requestId]);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(() => setCooldownSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/comments/ban/status")
        .then((r) => r.json())
        .then((data) => setBanStatus(data))
        .catch(() => setBanStatus({ banned: false }));
    } else {
      setBanStatus(null);
    }
  }, [session?.user?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id || !commentText.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/comments/request/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCommentText("");
        const sec = typeof data.cooldown_seconds === "number" ? data.cooldown_seconds : 600;
        setCooldownSec(sec);
        loadComments();
      } else {
        setError(data.error || "Failed to post");
        if (data.cooldown_seconds != null) setCooldownSec(data.cooldown_seconds);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: number) {
    try {
      await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // ignore
    }
  }

  async function handleBanUser(userId: string, reason?: string, durationDays?: string) {
    try {
      const res = await fetch("/api/comments/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          reason: reason || undefined,
          duration_days: durationDays ? parseInt(durationDays, 10) : undefined,
        }),
      });
      if (res.ok) {
        setShowBanModal(null);
        loadComments();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to ban user");
      }
    } catch (err) {
      alert("Failed to ban user");
    }
  }

  async function loadComments() {
    const res = await fetch(`/api/comments/request/${requestId}`);
    const data = await res.json();
    setComments(Array.isArray(data) ? data : []);
  }

  const { top, byParent } = buildTree(comments);

  function toggleReplies(parentId: number) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  if (loading) return <div className="comments-container"><p style={{ color: "var(--text-secondary)" }}>Loading comments...</p></div>;

  return (
    <section className="comments-container">
      {!hideHeader && <h2 style={{ marginBottom: 16 }}>Comments ({comments.length})</h2>}

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="comments-empty">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          top.map((comment) => {
            const replies = byParent.get(comment.id) ?? [];
            const hasReplies = replies.length > 0;
            const isRepliesExpanded = expandedReplies.has(comment.id);
            return (
              <div key={comment.id} className="comment-thread">
                <CommentCard
                  comment={comment}
                  isReply={false}
                  requestId={requestId}
                  sessionUserId={session?.user?.id}
                  isStaff={isStaff}
                  showStaffBadge={showStaffBadge}
                  commentsLocked={!!commentsLocked}
                  onDelete={handleDelete}
                  onReplySuccess={loadComments}
                  onBanClick={commentsLocked ? undefined : (userId, username) => setShowBanModal({ userId, username })}
                />
                {hasReplies && (
                  <div className="comment-replies-wrap">
                    {!isRepliesExpanded ? (
                      <button
                        type="button"
                        className="comment-view-replies-btn"
                        onClick={() => toggleReplies(comment.id)}
                      >
                        View Replies ({replies.length})
                      </button>
                    ) : (
                      <>
                        <div className="comment-replies-list">
                          {replies.map((reply) => (
                            <CommentCard
                              key={reply.id}
                              comment={reply}
                              isReply
                              requestId={requestId}
                              sessionUserId={session?.user?.id}
                              isStaff={isStaff}
                              showStaffBadge={showStaffBadge}
                              commentsLocked={!!commentsLocked}
                              onDelete={handleDelete}
                              onReplySuccess={loadComments}
                              onBanClick={commentsLocked ? undefined : (userId, username) => setShowBanModal({ userId, username })}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          className="comment-hide-replies-btn"
                          onClick={() => toggleReplies(comment.id)}
                        >
                          Hide Replies
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!!banStatus?.banned && (
        <div className="comments-banned-message">
          You cannot comment.
          {banStatus.reason ? ` Reason: ${banStatus.reason}` : ""}
          {banStatus.expires_at ? ` (until ${new Date(banStatus.expires_at).toLocaleDateString()})` : " (permanent)"}
        </div>
      )}
      {error && !(cooldownSec > 0) && <div className="comments-banned-message">{error}</div>}

      {cooldownSec > 0 ? (
        <div className="comment-cooldown">
          <BiIcon name="clock" size={16} className="comment-cooldown-icon" />
          <span className="comment-cooldown-label">Slow mode</span>
          <span className="comment-cooldown-timer">{formatCooldown(cooldownSec)}</span>
          <span className="comment-cooldown-hint">You can comment again in {formatCooldown(cooldownSec)}</span>
        </div>
      ) : null}

      {showBanModal && (
        <div className="comment-ban-modal-overlay" onClick={() => setShowBanModal(null)}>
          <div className="comment-ban-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ban from commenting</h3>
            <p>
              User: <strong>{showBanModal.username}</strong> (ID: {showBanModal.userId})
            </p>
            <label>
              Reason (optional):{" "}
              <input
                type="text"
                className="comment-ban-reason"
                placeholder="e.g. Spam"
                value={showBanModal.reason ?? ""}
                onChange={(e) => setShowBanModal((s) => (s ? { ...s, reason: e.target.value } : null))}
              />
            </label>
            <label>
              Duration (days, leave empty = permanent):{" "}
              <input
                type="number"
                min={1}
                className="comment-ban-days"
                placeholder="e.g. 7"
                value={showBanModal.durationDays ?? ""}
                onChange={(e) => setShowBanModal((s) => (s ? { ...s, durationDays: e.target.value } : null))}
              />
            </label>
            <div className="comment-ban-modal-actions">
              <button type="button" onClick={() => setShowBanModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="comment-ban-confirm"
                onClick={() =>
                  handleBanUser(showBanModal.userId, showBanModal.reason, showBanModal.durationDays)
                }
              >
                Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {!!commentsLocked && (
        <p style={{ color: "var(--text-secondary)", marginTop: 16 }}>Comments are locked.</p>
      )}
      {session?.user && !commentsLocked && !banStatus?.banned && (
        <form className="comment-form" onSubmit={handleSubmit}>
          <div className="comment-form-header">
            <UserAvatar
              avatar={session.user.image}
              userId={session.user.id}
              avatarDecoration={(session.user as { avatar_decoration?: string | null }).avatar_decoration ?? null}
              size={40}
              displayName={session.user.name ?? undefined}
              className="comment-form-avatar"
            />
            <div className="comment-form-input-wrapper">
              <textarea
                className="comment-form-input"
                placeholder={cooldownSec > 0 ? "Wait for slow mode to finish..." : "Add a comment..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value.slice(0, 2000))}
                rows={3}
                disabled={submitting || cooldownSec > 0}
              />
              <div className="comment-form-footer">
                <span className="comment-char-count">{commentText.length}/2000</span>
                <button
                  type="submit"
                  className="comment-submit"
                  disabled={!commentText.trim() || commentText.length > 2000 || submitting || cooldownSec > 0}
                >
                  {cooldownSec > 0 ? formatCooldown(cooldownSec) : submitting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {!session?.user && !commentsLocked && (
        <p style={{ color: "var(--text-secondary)", marginTop: 16 }}>
          <Link href={loginHref}>Sign in</Link> to comment.
        </p>
      )}
    </section>
  );
}
