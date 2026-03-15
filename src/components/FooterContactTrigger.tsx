"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ContactModalInner } from "@/components/ContactModal";

/** Footer Contact column trigger: opens Contact modal on click. */
export function FooterContactTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ure-footer-contact-trigger"
        onClick={() => setOpen(true)}
      >
        Contact us
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <ContactModalInner onClose={() => setOpen(false)} />,
          document.body
        )}
    </>
  );
}
