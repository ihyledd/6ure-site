"use client";

type Props = {
  pageId: string;
  deleteAction: (formData: FormData) => Promise<void>;
};

export function DeletePageForm({ pageId, deleteAction }: Props) {
  return (
    <form
      action={deleteAction}
      style={{ marginTop: 16 }}
      onSubmit={(e) => {
        if (!confirm("Delete this page? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="pageId" value={pageId} />
      <button
        type="submit"
        style={{
          padding: "10px 20px",
          borderRadius: 8,
          border: "1px solid var(--error)",
          background: "transparent",
          color: "var(--error)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Delete page
      </button>
    </form>
  );
}
