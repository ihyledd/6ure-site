"use client";

import { useRouter } from "next/navigation";

async function deleteCategory(categoryId: string) {
  await fetch(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
}

type Props = { categoryId: string; categoryName: string; pageCount: number };

export function DeleteCategoryButton({ categoryId, categoryName, pageCount }: Props) {
  const router = useRouter();

  const handleClick = () => {
    const msg = pageCount > 0
      ? `Delete "${categoryName}"? ${pageCount} page(s) will be unlinked from this category.`
      : `Delete "${categoryName}"?`;
    if (!confirm(msg)) return;
    deleteCategory(categoryId).then(() => router.refresh());
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid var(--error)",
        background: "transparent",
        color: "var(--error)",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Delete
    </button>
  );
}
