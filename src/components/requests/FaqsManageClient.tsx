"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BiIcon } from "./BiIcon";

type Faq = {
  id: number;
  question: string;
  answer: string;
  order_index: number;
  category: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export function FaqsManageClient() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    order_index: 0,
    category: "general" as "general" | "membership",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchFaqs = async () => {
    try {
      const r = await fetch("/api/faqs");
      if (!r.ok) return;
      const data = await r.json();
      setFaqs(Array.isArray(data) ? data : []);
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const r = await fetch(`/api/faqs/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Failed to update");
        }
      } else {
        const r = await fetch("/api/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Failed to create");
        }
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ question: "", answer: "", order_index: 0, category: "general" });
      fetchFaqs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save FAQ.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (faq: Faq) => {
    setEditingId(faq.id);
    setFormData({
      question: faq.question || "",
      answer: faq.answer || "",
      order_index: faq.order_index ?? 0,
      category: (faq.category === "membership" ? "membership" : "general") as "general" | "membership",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      const r = await fetch(`/api/faqs/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to delete");
      }
      fetchFaqs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="dashboard-content-block">
      <h1 className="dashboard-title">FAQs</h1>
      <p className="dashboard-description">
        Manage frequently asked questions for the requests section. Accordion list on the public FAQ page.
      </p>

      <div className="faqs-manage-header">
        <button
          type="button"
          className="faqs-add-btn"
          onClick={() => {
            setEditingId(null);
            setFormData({ question: "", answer: "", order_index: 0, category: "general" });
            setShowForm(true);
          }}
        >
          <BiIcon name="plus-lg" size={18} />
          Add FAQ
        </button>
      </div>

      {showForm && (
        <div className="protection-manage-modal">
          <div className="protection-manage-overlay" onClick={() => !submitting && (setShowForm(false), setEditingId(null))} />
          <div className="protection-manage-form-content">
            <div className="protection-manage-form-header">
              <h3>{editingId ? "Edit FAQ" : "Add FAQ"}</h3>
              <button type="button" onClick={() => !submitting && (setShowForm(false), setEditingId(null))}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="dashboard-form-group">
                <label>Question</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  required
                  placeholder="Short question"
                />
              </div>
              <div className="dashboard-form-group">
                <label>Answer (Markdown supported)</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  required
                  rows={4}
                  placeholder="Full answer"
                />
              </div>
              <div className="dashboard-form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as "general" | "membership" })}
                >
                  <option value="general">General</option>
                  <option value="membership">Membership</option>
                </select>
              </div>
              <div className="dashboard-form-group">
                <label>Order index (lower = first)</label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value, 10) || 0 })}
                  min={0}
                />
              </div>
              <div className="protection-manage-form-actions">
                <button type="button" onClick={() => !submitting && (setShowForm(false), setEditingId(null))}>Cancel</button>
                <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="dashboard-empty">Loading FAQs...</p>
      ) : faqs.length === 0 ? (
        <p className="dashboard-empty">
          No FAQs yet. Add one to show on the public FAQ page.
        </p>
      ) : (
        <div className="faqs-manage-list">
          {faqs.map((f) => (
            <div key={f.id} className="faqs-manage-item">
              <button
                type="button"
                className="faqs-manage-item-header"
                onClick={() => toggleExpand(f.id)}
                aria-expanded={expandedItems.has(f.id)}
              >
                <span className="faqs-manage-item-question">{f.question}</span>
                <span className="faqs-manage-item-badge">{f.category || "general"}</span>
                <span className="faqs-manage-item-chevron">{expandedItems.has(f.id) ? "▼" : "▶"}</span>
              </button>
              {expandedItems.has(f.id) && (
                <div className="faqs-manage-item-body">
                  <div className="faqs-manage-item-answer">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{f.answer}</ReactMarkdown>
                  </div>
                  <div className="faqs-manage-item-actions">
                    <button
                      type="button"
                      className="dashboard-btn-ghost dashboard-btn-sm"
                      onClick={() => handleEdit(f)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="dashboard-btn-danger dashboard-btn-sm"
                      onClick={() => handleDelete(f.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
