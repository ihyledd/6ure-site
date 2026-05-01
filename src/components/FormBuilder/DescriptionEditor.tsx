"use client";

import { useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
};

const TOOLBAR = [
  { label: "Bold", prefix: "**", suffix: "**" },
  { label: "Italic", prefix: "*", suffix: "*" },
  { label: "Link", prefix: "[", suffix: "](url)" },
  { label: "Bullet list", insert: "\n- " },
  { label: "Numbered list", insert: "\n1. " },
] as const;

export function DescriptionEditor({ value, onChange, placeholder, rows = 6 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrapOrInsert(prefix: string, suffix: string) {
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${suffix}`;
    const newVal = before + replacement + after;
    onChange(newVal);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + (selected ? prefix.length + selected.length : prefix.length);
    }, 0);
  }

  function insertText(text: string) {
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    const start = ta.selectionStart;
    const before = value.slice(0, start);
    const after = value.slice(start);
    onChange(before + text + after);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length;
    }, 0);
  }

  const btnLabel = (btn: (typeof TOOLBAR)[number]) =>
    btn.label === "Bold" ? "B" : btn.label === "Italic" ? "I" : btn.label === "Link" ? "Link" : btn.label === "Bullet list" ? "•" : "1.";

  return (
    <div className="description-editor">
      <div className="description-editor-toolbar">
        {TOOLBAR.map((btn) =>
          "prefix" in btn ? (
            <button
              key={btn.label}
              type="button"
              className="description-editor-btn"
              onClick={() => wrapOrInsert(btn.prefix, btn.suffix)}
              title={btn.label}
            >
              {btnLabel(btn)}
            </button>
          ) : (
            <button
              key={btn.label}
              type="button"
              className="description-editor-btn"
              onClick={() => insertText(btn.insert!)}
              title={btn.label}
            >
              {btnLabel(btn)}
            </button>
          )
        )}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="description-editor-textarea"
      />
      <span className="description-editor-hint">Supports markdown: **bold**, *italic*, lists</span>
    </div>
  );
}
