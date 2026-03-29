"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { BiIcon } from "./BiIcon";

type ProtectedUser = {
  id: number;
  userId: string;
  displayName: string | null;
  creatorName: string | null;
  subscriptionEndsAt?: string | null;
  socialLink?: string | null;
  creatorAvatar?: string | null;
  creatorPlatform?: string | null;
};

type ProtectedLink = {
  id: number | string;
  groupName: string;
  link: string;
  type: string;
  enabled?: boolean;
  yaml_file?: string | null;
  yaml_file_suggested?: string | null;
};

type YamlFile = {
  path: string;
  location: string;
  editor?: string | null;
};

export function ProtectionManageClient() {
  const [users, setUsers] = useState<ProtectedUser[]>([]);
  const [links, setLinks] = useState<ProtectedLink[]>([]);
  const [linksEnabled, setLinksEnabled] = useState(true);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "links">("users");
  const [showUserForm, setShowUserForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [userForm, setUserForm] = useState({ user_id: "", subscription_ends_at: "", social_link: "" });
  const [linkForm, setLinkForm] = useState<{
    group_name: string;
    new_group_name?: string;
    link: string;
    type: "link" | "keyword";
  }>({ group_name: "default", link: "", type: "link" });
  const [submitting, setSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({ subscription_ends_at: "", social_link: "" });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState("");
  const [groupEnabledToggling, setGroupEnabledToggling] = useState<string | null>(null);
  const [refreshStatsLoading, setRefreshStatsLoading] = useState(false);
  const [refreshStatsMessage, setRefreshStatsMessage] = useState<string | null>(null);
  const [yamlFiles, setYamlFiles] = useState<YamlFile[]>([]);
  const [groupYamlSaving, setGroupYamlSaving] = useState<string | null>(null);
  const [groupCleanupRunning, setGroupCleanupRunning] = useState<string | null>(null);
  const [groupCleanupMessage, setGroupCleanupMessage] = useState<string | null>(null);

  /** Same day, next month (e.g. 2026-03-08 → 2026-04-08). If no date, use today + 1 month. */
  const addOneMonth = (dateStr: string): string => {
    const base = dateStr?.trim() || new Date().toISOString().slice(0, 10);
    const d = new Date(base + "T12:00:00");
    if (isNaN(d.getTime())) return base;
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const r = await fetch("/api/protection/users");
      const data = await r.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchYamlFiles = async () => {
    try {
      const res = await fetch("/api/protection/links/yaml-files");
      if (!res.ok) return;
      const data = await res.json();
      setYamlFiles(Array.isArray(data.files) ? data.files : []);
    } catch {
      setYamlFiles([]);
    }
  };

  const fetchLinks = async () => {
    setLinksError(null);
    try {
      const r = await fetch("/api/protection/links");
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const msg = typeof err?.error === "string" ? err.error : r.status === 403 ? "Staff access required" : r.status === 401 ? "Authentication required" : "Failed to load protected links";
        setLinksError(msg);
        setLinks([]);
        return;
      }
      const data = await r.json();
      setLinks(Array.isArray(data.links) ? data.links : []);
      if (typeof data.enabled === "boolean") setLinksEnabled(data.enabled);
      fetchYamlFiles();
    } catch {
      setLinksError("Failed to load protected links");
      setLinks([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    setLinksError(null);
    Promise.all([
      fetch("/api/protection/users")
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? data : []))
        .catch(() => []),
      fetch("/api/protection/links")
        .then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            const msg = typeof err?.error === "string" ? err.error : r.status === 403 ? "Staff access required" : r.status === 401 ? "Authentication required" : "Failed to load protected links";
            setLinksError(msg);
            return { links: [], enabled: true };
          }
          return r.json();
        })
        .catch(() => {
          setLinksError("Failed to load protected links");
          return { links: [], enabled: true };
        }),
    ]).then(([usersData, linksData]) => {
      setUsers(usersData);
      setLinks(Array.isArray(linksData.links) ? linksData.links : []);
      if (typeof linksData.enabled === "boolean") setLinksEnabled(linksData.enabled);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === "links") fetchLinks();
  }, [activeTab]);

  const prevLinksRef = React.useRef<ProtectedLink[]>([]);
  useEffect(() => {
    if (links.length > 0 && prevLinksRef.current.length === 0) {
      const byGroup: Record<string, ProtectedLink[]> = {};
      for (const l of links) {
        const g = l.groupName || "default";
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(l);
      }
      const first = Object.keys(byGroup).sort()[0];
      if (first) setExpandedGroups(new Set([first]));
    }
    prevLinksRef.current = links;
  }, [links]);

  const setGroupYaml = async (groupName: string, yamlFile: string | null) => {
    setGroupYamlSaving(groupName);
    try {
      const res = await fetch(`/api/protection/links/group-yaml`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_name: groupName, yaml_file: yamlFile || null }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to set group YAML");
      }
      await fetchLinks();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setGroupYamlSaving(null);
    }
  };

  const cleanupGroupRequests = async (groupName: string) => {
    if (!groupName) return;
    const confirmed = window.confirm(
      `This will permanently delete any existing requests whose creator or product URLs match the protected links for "${groupName}".\n\nAre you sure you want to continue?`
    );
    if (!confirmed) return;

    setGroupCleanupMessage(null);
    setGroupCleanupRunning(groupName);
    try {
      const res = await fetch("/api/protection/links/group-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_name: groupName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to clean up requests for this group"
        );
      }
      const deleted = typeof data.deleted_count === "number" ? data.deleted_count : 0;
      setGroupCleanupMessage(
        deleted === 0
          ? `No existing requests matched the protected links for "${groupName}".`
          : `Removed ${deleted} existing request${deleted === 1 ? "" : "s"} matching "${groupName}".`
      );
    } catch (err: unknown) {
      setGroupCleanupMessage((err as Error).message || "Failed to clean up requests.");
    } finally {
      setGroupCleanupRunning(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.user_id.trim()) {
      alert("User ID (Discord ID) is required.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/protection/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userForm.user_id.trim(),
          subscription_ends_at: userForm.subscription_ends_at.trim() || null,
          social_link: userForm.social_link.trim() || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to add");
      }
      setShowUserForm(false);
      setUserForm({ user_id: "", subscription_ends_at: "", social_link: "" });
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add protected user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/protection/users/${encodeURIComponent(editingUserId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription_ends_at: editUserForm.subscription_ends_at.trim() || null,
          social_link: editUserForm.social_link.trim() || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to update");
      }
      setEditingUserId(null);
      setEditUserForm({ subscription_ends_at: "", social_link: "" });
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Remove this user from protected list?")) return;
    try {
      const r = await fetch(`/api/protection/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to delete");
      }
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  const parseLinksInput = (text: string): string[] =>
    text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = parseLinksInput(linkForm.link);
    if (items.length === 0) {
      alert("Enter at least one URL or keyword (newline or comma-separated).");
      return;
    }
    const groupName =
      linkForm.group_name === "__new__"
        ? (linkForm.new_group_name ?? "").trim() || "default"
        : (linkForm.group_name || "default").trim();
    if (!groupName) {
      alert("Please enter or select a group name.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/protection/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_name: groupName,
          links: items,
          type: linkForm.type,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to add");
      }
      setShowLinkForm(false);
      setLinkForm({ group_name: "default", link: "", type: "link" });
      fetchLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add protected link.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGroupExpanded = useCallback((group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const openAddLinkForm = useCallback((groupName?: string) => {
    setLinkForm({
      group_name: groupName ?? "default",
      new_group_name: "",
      link: "",
      type: "link",
    });
    setShowLinkForm(true);
  }, []);

  const setGroupEnabled = useCallback(
    async (groupName: string, enabled: boolean) => {
      setGroupEnabledToggling(groupName);
      try {
        const r = await fetch("/api/protection/links/group-enabled", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group_name: groupName, enabled }),
        });
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Failed to update");
        }
        await fetchLinks();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to update group enabled state");
      } finally {
        setGroupEnabledToggling(null);
      }
    },
    []
  );

  const handleDeleteLink = async (id: number | string) => {
    if (!confirm("Remove this protected link?")) return;
    try {
      const r = await fetch(`/api/protection/links/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to delete");
      }
      fetchLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  const setLinksEnabledToggle = async (enabled: boolean) => {
    try {
      const r = await fetch("/api/protection/links/enabled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to update");
      }
      setLinksEnabled(enabled);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update enabled state");
    }
  };

  const handleRefreshStats = async () => {
    setRefreshStatsLoading(true);
    setRefreshStatsMessage(null);
    try {
      const r = await fetch("/api/admin/protection/refresh-stats", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail ?? data.error ?? "Refresh failed");
      await fetchUsers();
      const msg =
        data.refreshed != null
          ? `Refreshed ${data.refreshed} user(s).${data.failed ? ` ${data.failed} failed.` : ""}`
          : "Done.";
      setRefreshStatsMessage(msg);
      setTimeout(() => setRefreshStatsMessage(null), 5000);
    } catch (e) {
      setRefreshStatsMessage(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshStatsLoading(false);
    }
  };

  const openEditUser = (u: ProtectedUser) => {
    setEditingUserId(u.userId);
    setEditUserForm({
      subscription_ends_at: u.subscriptionEndsAt || "",
      social_link: u.socialLink || "",
    });
  };

  const displayName = (u: ProtectedUser) =>
    u.displayName || u.creatorName || u.userId;

  const avatarUrl = (u: ProtectedUser) => {
    if (u.creatorAvatar) return u.creatorAvatar;
    return `https://cdn.discordapp.com/embed/avatars/${Number(u.userId) % 5}.png`;
  };

  return (
    <div className="dashboard-content-block">
      <h1 className="dashboard-title">Protection</h1>
      <p className="dashboard-description">
        Manage protected users (visible on <Link href="/requests/protected">Protected</Link>) and protected links (URLs/keywords that block request submission).
      </p>

      <div className="protection-manage-tabs">
        <button
          type="button"
          className={`protection-manage-tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Protected Users
        </button>
        <button
          type="button"
          className={`protection-manage-tab ${activeTab === "links" ? "active" : ""}`}
          onClick={() => setActiveTab("links")}
        >
          Protected Links
        </button>
      </div>

      {activeTab === "users" && (
        <section className="dashboard-card">
          <div className="protection-manage-section-header">
            <h2 className="dashboard-card-title">Protected Users</h2>
            <p className="dashboard-card-desc">
              List is visible to everyone on the <Link href="/requests/protected">Protected</Link> page. Add user (Discord ID), subscription end date, and optional TikTok or YouTube profile URL.
            </p>
            <div className="protection-manage-header-actions">
              <button
                type="button"
                className="dashboard-btn dashboard-btn-ghost protection-manage-btn-refresh"
                onClick={handleRefreshStats}
                disabled={refreshStatsLoading}
                title="Re-fetch follower/video stats from TikTok/YouTube for all users with a social link"
              >
                {refreshStatsLoading ? "Refreshing…" : "Refresh stats"}
              </button>
              <button
                type="button"
                className="protection-manage-btn-add"
                onClick={() => {
                  setShowUserForm(true);
                  setUserForm({ user_id: "", subscription_ends_at: "", social_link: "" });
                }}
              >
                <BiIcon name="plus-lg" size={18} />
                Add User
              </button>
            </div>
            {refreshStatsMessage && (
              <p className="protection-manage-refresh-message" role="status">
                {refreshStatsMessage}
              </p>
            )}
          </div>



          {usersLoading ? (
            <p className="dashboard-empty">Loading protected users...</p>
          ) : users.length === 0 ? (
            <p className="dashboard-empty">
              No protected users yet. Add a user (Discord ID), subscription end date, and optional social link.
            </p>
          ) : (
            <div className="protection-manage-users-list">
              {users.map((u) => (
                <div key={u.userId} className="protection-manage-user-item">
                  <div className="protection-manage-user-avatar">
                    <Image
                      src={avatarUrl(u)}
                      alt=""
                      width={36}
                      height={36}
                      unoptimized
                      style={{ borderRadius: 8 }}
                    />
                  </div>
                  <div className="protection-manage-user-info">
                    <span className="protection-manage-user-name">{displayName(u)}</span>
                    <span className="protection-manage-user-meta">
                      {u.subscriptionEndsAt || "—"}
                      {(u.creatorPlatform === "tiktok" || u.creatorPlatform === "youtube") && u.creatorName && (
                        <span className="protection-manage-user-creator">
                          {u.creatorPlatform}: {u.creatorName}
                        </span>
                      )}
                      {u.socialLink && (
                        <a href={u.socialLink} target="_blank" rel="noopener noreferrer" className="protection-manage-user-social">
                          Link
                        </a>
                      )}
                    </span>
                  </div>
                  <div className="protection-manage-user-actions">
                    <button type="button" className="protection-manage-btn-edit" onClick={() => openEditUser(u)} title="Edit">
                      Edit
                    </button>
                    <button type="button" className="protection-manage-btn-delete" onClick={() => handleDeleteUser(u.userId)} title="Remove">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "links" && (
        <section className="dashboard-card">
          <div className="protection-manage-section-header">
            <h2 className="dashboard-card-title">Protected Links</h2>
            <p className="dashboard-card-desc">
              URLs or keywords that block request submission. Creator or product URLs matching these cannot be requested.
            </p>
            <div className="protection-manage-links-toolbar">
              <label className="protection-manage-enabled-toggle">
                <span className="protection-manage-enabled-label">Enabled</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={linksEnabled}
                  className={`protection-manage-toggle ${linksEnabled ? "active" : ""}`}
                  onClick={() => setLinksEnabledToggle(!linksEnabled)}
                >
                  <span className="protection-manage-toggle-thumb" />
                </button>
              </label>
              <button
                type="button"
                className="dashboard-btn dashboard-btn-primary protection-manage-btn-add-link"
                onClick={() => openAddLinkForm()}
              >
                <BiIcon name="link-45deg" size={18} />
                Add Link
              </button>
            </div>
          </div>



          {linksError ? (
            <div className="protection-manage-links-error">
              <p className="dashboard-empty">{linksError}</p>
              <button type="button" className="dashboard-btn dashboard-btn-ghost" onClick={fetchLinks}>Retry</button>
            </div>
          ) : links.length === 0 ? (
            <p className="dashboard-empty">
              No protected links yet. Add a URL or keyword to block request submission for matching creator or product links.
            </p>
          ) : (
            <>
              <div className="protection-manage-search">
                <BiIcon name="search" size={18} className="protection-manage-search-icon" aria-hidden />
                <input
                  type="text"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="Search by editor / group name..."
                  className="protection-manage-search-input"
                  aria-label="Search by editor or group"
                />
              </div>
              <div className="protection-manage-list">
                {(() => {
                  const byGroup: Record<string, ProtectedLink[]> = {};
                  for (const l of links) {
                    const g = l?.groupName ?? "default";
                    if (!byGroup[g]) byGroup[g] = [];
                    byGroup[g].push(l);
                  }
                  const allGroups = Object.keys(byGroup).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
                  const searchLower = groupSearch.trim().toLowerCase();
                  const groups = searchLower
                    ? allGroups.filter((g) => g.toLowerCase().includes(searchLower))
                    : allGroups;
                  if (groups.length === 0) {
                    return (
                      <div className="protection-manage-empty">
                        <p>No editors match &quot;{groupSearch.trim()}&quot;.</p>
                      </div>
                    );
                  }
                  return groups.map((group) => {
                    const groupLinks = byGroup[group] ?? [];
                    const count = groupLinks.length;
                    const isExpanded = expandedGroups.has(group);
                    const groupEnabled = groupLinks[0]?.enabled !== false;
                    const supportsGroupEnabled = groupLinks[0]?.enabled !== undefined;
                    const toggling = groupEnabledToggling === group;
                    const cleaning = groupCleanupRunning === group;
                    return (
                      <section
                        key={group}
                        className={`protection-manage-group ${!groupEnabled ? "protection-manage-group-disabled" : ""}`}
                      >
                        <div className="protection-manage-group-header">
                          <button
                            type="button"
                            className="protection-manage-group-title-btn"
                            onClick={() => toggleGroupExpanded(group)}
                            aria-expanded={isExpanded}
                          >
                            <span className="protection-manage-group-name">{group}</span>
                            <span className="protection-manage-group-count">
                              {count} {count === 1 ? "entry" : "entries"}
                            </span>
                            <span className="protection-manage-group-chevron" aria-hidden>
                              {isExpanded ? "▼" : "▶"}
                            </span>
                          </button>
                          <div
                            className="protection-manage-group-yaml-wrap"
                            onClick={(e) => e.stopPropagation()}
                            title="YAML file for this group (moved to protected when group is on; moved to Leaks when group is off)"
                          >
                            <select
                              className="protection-manage-group-yaml-select"
                              value={groupLinks[0]?.yaml_file ?? ""}
                              disabled={groupYamlSaving === group}
                              onChange={(e) =>
                                setGroupYaml(group, e.target.value || null)
                              }
                              aria-label={`YAML file for ${group}`}
                            >
                              <option value="">No YAML</option>
                              {(() => {
                                const current = groupLinks[0]?.yaml_file;
                                const suggested = groupLinks[0]?.yaml_file_suggested;
                                const inList = current && yamlFiles.some((f) => f.path === current);
                                const options: YamlFile[] = [...yamlFiles];
                                if (current && !inList) {
                                  options.push({ path: current, location: "?" });
                                }
                                return options.map((f) => (
                                  <option key={f.path} value={f.path}>
                                    {f.path}
                                    {f.path === suggested && suggested
                                      ? " (suggested)"
                                      : ` (${f.location})`}
                                  </option>
                                ));
                              })()}
                            </select>
                          </div>
                          {supportsGroupEnabled && (
                            <label
                              className="protection-manage-group-enabled-toggle"
                              title={groupEnabled ? "Disable this group" : "Enable this group"}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="protection-manage-group-enabled-label">
                                {groupEnabled ? "On" : "Off"}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={groupEnabled}
                                disabled={toggling}
                                className={`protection-manage-toggle protection-manage-group-toggle ${groupEnabled ? "active" : ""}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setGroupEnabled(group, !groupEnabled);
                                }}
                              >
                                <span className="protection-manage-toggle-thumb" />
                              </button>
                            </label>
                          )}
                          <button
                            type="button"
                            className="dashboard-btn dashboard-btn-ghost protection-manage-group-cleanup-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              cleanupGroupRequests(group);
                            }}
                            disabled={cleaning}
                            title="Delete existing requests that contain this group's protected links"
                          >
                            {cleaning ? "Cleaning…" : "Clean up requests"}
                          </button>
                          <button
                            type="button"
                            className="protection-manage-btn-add-in-group"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddLinkForm(group);
                            }}
                            title="Add link or keyword to this editor"
                          >
                            <BiIcon name="plus-lg" size={14} />
                            Add
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="protection-manage-group-items">
                            {groupCleanupMessage && (
                              <p
                                className="protection-manage-group-cleanup-message"
                                role="status"
                              >
                                {groupCleanupMessage}
                              </p>
                            )}
                            {groupLinks.map((l) => (
                              <div key={l.id} className="protection-manage-item">
                                <div className="protection-manage-item-main">
                                  <span className="protection-manage-item-type" title={l.type === "keyword" ? "Keyword" : "URL"}>
                                    {l.type === "keyword" ? (
                                      <BiIcon name="key" size={14} />
                                    ) : (
                                      <BiIcon name="link-45deg" size={14} />
                                    )}
                                  </span>
                                  <span className="protection-manage-item-link">{l.link}</span>
                                </div>
                                <button
                                  type="button"
                                  className="protection-manage-btn-delete"
                                  onClick={() => handleDeleteLink(l.id)}
                                  title="Remove"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </section>
      )}
      {showUserForm && (
        <div className="protection-manage-modal">
          <div className="protection-manage-overlay" onClick={() => !submitting && setShowUserForm(false)} />
          <div className="protection-manage-form-content">
            <div className="protection-manage-form-header">
              <h3>Add Protected User</h3>
              <button type="button" onClick={() => !submitting && setShowUserForm(false)}>×</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="dashboard-form-group">
                <label>User ID (Discord ID)</label>
                <input
                  type="text"
                  value={userForm.user_id}
                  onChange={(e) => setUserForm({ ...userForm, user_id: e.target.value })}
                  placeholder="e.g. 123456789012345678"
                  required
                />
              </div>
              <div className="dashboard-form-group">
                <label>Subscription ends (date)</label>
                <div className="protection-manage-date-row">
                  <input
                    type="date"
                    value={userForm.subscription_ends_at}
                    onChange={(e) => setUserForm({ ...userForm, subscription_ends_at: e.target.value })}
                    placeholder="YYYY-MM-DD"
                  />
                  <button
                    type="button"
                    className="dashboard-btn dashboard-btn-ghost protection-manage-btn-add-month"
                    onClick={() =>
                      setUserForm({
                        ...userForm,
                        subscription_ends_at: addOneMonth(userForm.subscription_ends_at),
                      })
                    }
                    title="Set to same day, next month"
                  >
                    +1 month
                  </button>
                </div>
              </div>
              <div className="dashboard-form-group">
                <label>TikTok or YouTube URL (optional)</label>
                <input
                  type="url"
                  value={userForm.social_link}
                  onChange={(e) => setUserForm({ ...userForm, social_link: e.target.value })}
                  placeholder="tiktok.com/@user or youtube.com/@channel"
                />
              </div>
              <div className="protection-manage-form-actions">
                <button type="button" onClick={() => !submitting && setShowUserForm(false)}>Cancel</button>
                <button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUserId && (() => {
        const u = users.find((x) => x.userId === editingUserId);
        if (!u) return null;
        return (
          <div className="protection-manage-modal">
            <div className="protection-manage-overlay" onClick={() => !submitting && setEditingUserId(null)} />
            <div className="protection-manage-form-content">
              <div className="protection-manage-form-header">
                <h3>Edit Protected User</h3>
                <button type="button" onClick={() => !submitting && setEditingUserId(null)}>×</button>
              </div>
              <p className="protection-manage-edit-user-label">{displayName(u)}</p>
              <p className="protection-manage-edit-user-id">User ID: {u.userId}</p>
              <form onSubmit={handleUpdateUser}>
                <div className="dashboard-form-group">
                  <label>Subscription ends (date)</label>
                  <div className="protection-manage-date-row">
                    <input
                      type="date"
                      value={editUserForm.subscription_ends_at}
                      onChange={(e) => setEditUserForm({ ...editUserForm, subscription_ends_at: e.target.value })}
                    />
                    <button
                      type="button"
                      className="dashboard-btn dashboard-btn-ghost protection-manage-btn-add-month"
                      onClick={() =>
                        setEditUserForm({
                          ...editUserForm,
                          subscription_ends_at: addOneMonth(editUserForm.subscription_ends_at),
                        })
                      }
                      title="Set to same day, next month"
                    >
                      +1 month
                    </button>
                  </div>
                </div>
                <div className="dashboard-form-group">
                  <label>TikTok or YouTube URL (optional)</label>
                  <input
                    type="url"
                    value={editUserForm.social_link}
                    onChange={(e) => setEditUserForm({ ...editUserForm, social_link: e.target.value })}
                    placeholder="tiktok.com/@user or youtube.com/@channel"
                  />
                </div>
                <div className="protection-manage-form-actions">
                  <button type="button" onClick={() => !submitting && setEditingUserId(null)}>Cancel</button>
                  <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {showLinkForm && (() => {
        const existingGroups = [...new Set(["default", ...links.map((l) => l.groupName || "default")])].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        );
        const showNewGroupInput = linkForm.group_name === "__new__";
        const parsedLinks = parseLinksInput(linkForm.link);
        const canSubmit =
          parsedLinks.length > 0 && (showNewGroupInput ? !!linkForm.new_group_name?.trim() : true);
        return (
          <div className="protection-manage-modal">
            <div className="protection-manage-overlay" onClick={() => !submitting && setShowLinkForm(false)} />
            <div className="protection-manage-form-content protection-manage-form-content-wide">
              <div className="protection-manage-form-header">
                <h3>Add Protected Link or Keyword</h3>
                <button type="button" onClick={() => !submitting && setShowLinkForm(false)}>×</button>
              </div>
              <form onSubmit={handleAddLink}>
                <div className="dashboard-form-group">
                  <label>Group (editor)</label>
                  <select
                    value={linkForm.group_name}
                    onChange={(e) =>
                      setLinkForm({
                        ...linkForm,
                        group_name: e.target.value,
                      })
                    }
                  >
                    <option value="__new__">- Create new group -</option>
                    {existingGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {showNewGroupInput && (
                    <input
                      type="text"
                      className="protection-manage-form-new-group"
                      value={linkForm.new_group_name ?? ""}
                      onChange={(e) =>
                        setLinkForm({
                          ...linkForm,
                          new_group_name: e.target.value,
                        })
                      }
                      placeholder="New group name"
                      autoFocus
                    />
                  )}
                </div>
                <div className="dashboard-form-group">
                  <label>Type</label>
                  <select
                    value={linkForm.type}
                    onChange={(e) => setLinkForm({ ...linkForm, type: e.target.value as "link" | "keyword" })}
                  >
                    <option value="link">URL (exact or contains)</option>
                    <option value="keyword">Keyword (URL contains this text)</option>
                  </select>
                </div>
                <div className="dashboard-form-group">
                  <label>{linkForm.type === "keyword" ? "Keyword(s)" : "URL(s)"}</label>
                  <textarea
                    value={linkForm.link}
                    onChange={(e) => setLinkForm({ ...linkForm, link: e.target.value })}
                    placeholder={
                      linkForm.type === "keyword"
                        ? "e.g. payhip.com/creator\nOne per line or comma-separated"
                        : "https://payhip.com/b/Dpx4X\nhttps://payhip.com/b/zMHtJ\nOne per line or comma-separated"
                    }
                    rows={4}
                    required
                  />
                </div>
                <div className="protection-manage-form-actions">
                  <button type="button" onClick={() => !submitting && setShowLinkForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || !canSubmit}>
                    {submitting ? "Adding..." : parsedLinks.length > 1 ? `Add ${parsedLinks.length} links` : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
