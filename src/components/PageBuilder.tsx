"use client";

import { useCallback, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";

type Preset = { label: string; icon: string; snippet: string };

const PRESETS: Preset[] = [
  { label: "H1", icon: "H1", snippet: "# Title\n" },
  { label: "H2", icon: "H2", snippet: "## Subtitle\n" },
  { label: "H3", icon: "H3", snippet: "### Heading\n" },
  { label: "Bold", icon: "B", snippet: "**bold**" },
  { label: "Italic", icon: "I", snippet: "*italic*" },
  { label: "Divider", icon: "-", snippet: "\n---\n" },
  { label: "Link", icon: "🔗", snippet: "[text](url)" },
  { label: "Image", icon: "🖼", snippet: "![alt](url)" },
  { label: "Video", icon: "🎬", snippet: '<video src="url" controls width="100%" />' },
  { label: "Quote", icon: "❝", snippet: "\n> Quote text\n" },
  { label: "Bullets", icon: "•", snippet: "\n- Item 1\n- Item 2\n- Item 3\n" },
  { label: "Numbers", icon: "#", snippet: "\n1. First\n2. Second\n3. Third\n" },
  { label: "Code", icon: "</>", snippet: "\n```js\ncode\n```\n" },
  { label: "Inline Code", icon: "`c`", snippet: "`code`" },
  { label: "Table", icon: "⊞", snippet: "\n| Col 1 | Col 2 |\n|-------|-------|\n| A     | B     |\n" },
  { label: "Tip", icon: "💡", snippet: "\n::: tip\nHelpful tip.\n:::\n" },
  { label: "Info", icon: "ℹ", snippet: "\n::: info\nInformation.\n:::\n" },
  { label: "Warning", icon: "⚠", snippet: "\n::: warning\nWarning message.\n:::\n" },
  { label: "Danger", icon: "🚫", snippet: "\n::: danger\nDanger alert.\n:::\n" },
  { label: "Details", icon: "▸", snippet: "\n::: details Click to expand\nHidden content.\n:::\n" },
];

type Props = {
  name: string;
  defaultValue?: string;
};

export function PageBuilder({ name, defaultValue = "" }: Props) {
  const [content, setContent] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = useCallback(
    (snippet: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = content.slice(0, start);
      const after = content.slice(end);
      const newContent = before + snippet + after;
      setContent(newContent);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + snippet.length;
      });
    },
    [content],
  );

  return (
    <div className="page-builder">
      <input type="hidden" name={name} value={content} />

      {/* Toolbar */}
      <div className="page-builder-toolbar">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="page-builder-toolbar-btn"
            onClick={() => insertSnippet(p.snippet)}
            title={p.label}
          >
            <span>{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>

      {/* Editor + Preview side by side */}
      <div className="page-builder-editor-area">
        <div className="page-builder-edit-col">
          <div className="page-builder-col-title">Markdown Editor</div>
          <textarea
            ref={textareaRef}
            className="page-builder-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="page-builder-preview-col">
          <div className="page-builder-col-title">Preview</div>
          <div className="page-builder-preview-pane">
            {content.trim() ? (
              <Markdown markdown={content} />
            ) : (
              <p style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
                Start typing or click a component to see preview...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
