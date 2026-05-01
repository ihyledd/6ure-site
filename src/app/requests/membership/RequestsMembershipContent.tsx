"use client";

import { useState } from "react";
import { MarkdownProse } from "@/components/Markdown";
import { BiIcon } from "@/components/requests/BiIcon";

type FaqItem = { id: number; question: string; answer: string };

export function RequestsMembershipContent({ faqs }: { faqs: FaqItem[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <section className="membership-faq">
      <h2 className="membership-faq-header">FAQ</h2>
      {faqs.length === 0 ? (
        <p className="membership-faq-empty">
          No FAQ entries yet. Staff can add them in the Dashboard (Requests → FAQs) with category &quot;Membership&quot;.
        </p>
      ) : (
        <div className="membership-faq-list">
          {faqs.map((item) => (
            <div
              key={item.id}
              className={`membership-faq-item ${openId === item.id ? "open" : ""}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                className="membership-faq-question"
                aria-expanded={openId === item.id}
                aria-controls={`membership-faq-answer-${item.id}`}
                id={`membership-faq-question-${item.id}`}
              >
                <span className="membership-faq-question-text">
                  <MarkdownProse content={item.question} inline className="membership-faq-question-markdown" />
                </span>
                <BiIcon
                  name="chevron-down"
                  size={20}
                  className="membership-faq-chevron"
                  aria-hidden
                />
              </button>
              <div
                id={`membership-faq-answer-${item.id}`}
                role="region"
                aria-labelledby={`membership-faq-question-${item.id}`}
                className="membership-faq-answer"
                hidden={openId !== item.id}
              >
                <div className="membership-faq-answer-markdown">
                  <MarkdownProse content={item.answer} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
