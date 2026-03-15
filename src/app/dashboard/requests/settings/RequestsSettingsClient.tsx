"use client";

import { useState, useEffect, useCallback } from "react";
import { EmbedsFormEditor } from "./EmbedsFormEditor";
import { MembershipFormEditor } from "./MembershipFormEditor";
import { PopupsFormEditor } from "./PopupsFormEditor";
import { UserSettingsFormEditor } from "./UserSettingsFormEditor";

type TabId = "embeds" | "popups" | "membership" | "defaults";

const TABS: { id: TabId; label: string }[] = [
  { id: "embeds", label: "Embeds" },
  { id: "popups", label: "Popups" },
  { id: "membership", label: "Membership" },
  { id: "defaults", label: "Default user settings" },
];

export function RequestsSettingsClient() {
  const [activeTab, setActiveTab] = useState<TabId>("embeds");
  const [embeds, setEmbeds] = useState<Record<string, string>>({});
  const [popups, setPopups] = useState<Record<string, string>>({});
  const [membership, setMembership] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEmbeds = useCallback(async () => {
    try {
      const r = await fetch("/api/site-settings/embeds");
      if (r.ok) {
        const d = await r.json();
        setEmbeds(d ?? {});
      }
    } catch {
      setEmbeds({});
    }
  }, []);

  const loadPopups = useCallback(async () => {
    try {
      const r = await fetch("/api/site-settings/popups");
      if (r.ok) {
        const d = await r.json();
        setPopups(d ?? {});
      }
    } catch {
      setPopups({});
    }
  }, []);

  const loadMembership = useCallback(async () => {
    try {
      const r = await fetch("/api/site-settings/membership");
      if (r.ok) {
        const d = await r.json();
        setMembership(d ?? {});
      }
    } catch {
      setMembership({});
    }
  }, []);

  const loadDefaults = useCallback(async () => {
    try {
      const r = await fetch("/api/site-settings/default");
      if (r.ok) {
        const d = await r.json();
        setDefaults(d ?? {});
      }
    } catch {
      setDefaults({});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      await Promise.all([loadEmbeds(), loadPopups(), loadMembership(), loadDefaults()]);
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadEmbeds, loadPopups, loadMembership, loadDefaults]);

  const updateEmbeds = useCallback((key: string, value: string) => {
    setEmbeds((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updatePopups = useCallback((key: string, value: string) => {
    setPopups((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMembership = useCallback((key: string, value: string) => {
    setMembership((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateDefaults = useCallback((key: string, value: string) => {
    setDefaults((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveEmbeds = useCallback(async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/site-settings/embeds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(embeds),
      });
      if (r.ok) await loadEmbeds();
    } finally {
      setSaving(false);
    }
  }, [embeds, loadEmbeds]);

  const savePopups = useCallback(async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/site-settings/popups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(popups),
      });
      if (r.ok) await loadPopups();
    } finally {
      setSaving(false);
    }
  }, [popups, loadPopups]);

  const saveMembership = useCallback(async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/site-settings/membership", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(membership),
      });
      if (r.ok) await loadMembership();
    } finally {
      setSaving(false);
    }
  }, [membership, loadMembership]);

  const saveDefaults = useCallback(async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/site-settings/default", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      });
      if (r.ok) await loadDefaults();
    } finally {
      setSaving(false);
    }
  }, [defaults, loadDefaults]);

  const refreshEmbeds = useCallback(async () => {
    setRefreshStatus("Refreshing…");
    try {
      const r = await fetch("/api/requests/refresh-embeds", { method: "POST" });
      const data = await r.json().catch(() => ({}));
      setRefreshStatus(r.ok ? (data.message ?? "Done") : "Refresh failed");
      setTimeout(() => setRefreshStatus(null), 4000);
    } catch {
      setRefreshStatus("Refresh failed");
      setTimeout(() => setRefreshStatus(null), 4000);
    }
  }, []);

  if (loading) {
    return (
      <div className="dashboard-section-header">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header" style={{ marginBottom: 24 }}>
        <h2>Requests settings</h2>
        <p>Configure embeds, popups, and default user preferences.</p>
      </div>

      <div className="dashboard-tabs" style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`dashboard-tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "embeds" && (
        <EmbedsFormEditor
          form={embeds}
          update={updateEmbeds}
          saving={saving}
          onSave={saveEmbeds}
          onRefreshEmbeds={refreshEmbeds}
          refreshStatus={refreshStatus}
        />
      )}
      {activeTab === "popups" && (
        <PopupsFormEditor
          form={popups}
          update={updatePopups}
          saving={saving}
          onSave={savePopups}
        />
      )}
      {activeTab === "membership" && (
        <MembershipFormEditor
          form={membership}
          update={updateMembership}
          saving={saving}
          onSave={saveMembership}
        />
      )}
      {activeTab === "defaults" && (
        <UserSettingsFormEditor
          form={defaults}
          update={updateDefaults}
          saving={saving}
          onSave={saveDefaults}
        />
      )}
    </div>
  );
}
