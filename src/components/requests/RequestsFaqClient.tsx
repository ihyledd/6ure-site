"use client";

import { useState } from "react";
import { MarkdownProse } from "@/components/Markdown";

type FaqItem = { id: number; question: string; answer: string; category?: string };

export function RequestsFaqClient({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="faq-empty">
        <p>No FAQs yet.</p>
      </div>
    );
  }

  return (
    <div className="faq-list">
      {items.map((item) => (
        <div
          key={item.id}
          className={`faq-item ${openId === item.id ? "expanded" : ""}`}
          onClick={() => setOpenId(openId === item.id ? null : item.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenId(openId === item.id ? null : item.id);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="faq-question-header">
            <div className="faq-question-content">
              <MarkdownProse content={item.question} inline className="faq-question-markdown" />
            </div>
          </div>
          <div className={`faq-answer ${openId === item.id ? "visible" : ""}`}>
            <div className="faq-answer-content">
              <div className="faq-markdown">
                <MarkdownProse content={item.answer} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
