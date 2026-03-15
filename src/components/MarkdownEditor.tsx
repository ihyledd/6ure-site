"use client";

import { useRef } from "react";

type Props = {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
};

const INSERTS: { label: string; value: string }[] = [
  { label: "Link", value: "[text](url)" },
  { label: "Image", value: "![alt](image-url)" },
  { label: "Video", value: '<video src="url" controls />' },
  { label: "Tip", value: "\n::: tip\nYour tip here.\n:::\n" },
  { label: "Warning", value: "\n::: warning\nWarning text.\n:::\n" },
  { label: "Code", value: "\n```\ncode here\n```\n" },
];

export function MarkdownEditor({ name, defaultValue = "", rows = 18, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert(value: string) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + value + after;
    ta.selectionStart = ta.selectionEnd = start + value.length;
    ta.focus();
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {INSERTS.map(({ label, value }) => (
          <button
            key={label}
            type="button"
            onClick={() => insert(value)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "var(--glass-border)",
              background: "var(--glass-tertiary-bg)",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + {label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={{ width: "100%", fontFamily: "var(--font-mono), monospace" }}
      />
    </div>
  );
}
