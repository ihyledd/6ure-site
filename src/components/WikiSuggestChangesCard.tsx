"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ContactModalInner } from "@/components/ContactModal";

export function WikiSuggestChangesCard() {
  const [open, setOpen] = useState(false);

  return (
    <section className="wiki-suggest-section" aria-label="Suggest changes">
      <div className="wiki-suggest-card">
        <div className="wiki-suggest-card-content">
          <h3 className="wiki-suggest-card-title">Suggest changes</h3>
          <p className="wiki-suggest-card-desc">
            Found something to add or fix? Your feedback helps us improve the docs.
          </p>
          <button
            type="button"
            className="wiki-suggest-card-btn"
            onClick={() => setOpen(true)}
          >
            Suggest changes
          </button>
        </div>
      </div>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <ContactModalInner onClose={() => setOpen(false)} />,
          document.body
        )}
    </section>
  );
}
