"use client";

import { BiIcon } from "./BiIcon";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
};

function getPageNumbers(page: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const showEllipsisStart = page > 3;
  const showEllipsisEnd = page < totalPages - 2;
  const result: (number | "...")[] = [1];
  if (showEllipsisStart) result.push("...");
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let i = start; i <= end; i++) {
    if (!result.includes(i)) result.push(i);
  }
  if (showEllipsisEnd) result.push("...");
  if (totalPages > 1) result.push(totalPages);
  return result;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(1)}
        disabled={page <= 1}
        title="First page"
        aria-label="First page"
      >
        <BiIcon name="chevron-double-left" size={14} />
      </button>
      <button
        type="button"
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        title="Previous page"
        aria-label="Previous page"
      >
        <BiIcon name="chevron-left" size={14} />
        <span>Prev</span>
      </button>

      <div className="pagination-pages">
        {pageNumbers.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`pagination-num ${p === page ? "active" : ""}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        title="Next page"
        aria-label="Next page"
      >
        <span>Next</span>
        <BiIcon name="chevron-right" size={14} />
      </button>
      <button
        type="button"
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(totalPages)}
        disabled={page >= totalPages}
        title="Last page"
        aria-label="Last page"
      >
        <BiIcon name="chevron-double-right" size={14} />
      </button>

      <div className="pagination-info">
        <span>
          Page {page} of {totalPages}
        </span>
        <span className="pagination-total">({total} total)</span>
      </div>
    </div>
  );
}
