"use client";

import Link from "next/link";
import { Dispatch, ReactNode, SetStateAction } from "react";
import { Pagination, Spinner } from "@heroui/react";
import Image from "next/image";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[28px] bg-card/50">
      <Spinner size="lg" />
      {label ? <p className="text-xs text-secondary/55">{label}</p> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-[28px] bg-card/50 px-6 text-center">
      <p className="max-w-sm text-sm text-secondary/60">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-white transition hover:bg-secondary/90"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  svgName,
}: {
  title: string;
  svgName?: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[24px] border border-dashed border-black/10 bg-white/70 px-6 py-10 text-center">
      {svgName && (
        <Image
          src={`/svgs/${svgName}`}
          alt="image"
          width={0}
          height={0}
          sizes="100vw"
          className="mx-auto w-40 h-fit mb-4"
        />
      )}
      <p className="text-sm font-semibold text-secondary">{title}</p>
      <p className="max-w-sm text-xs leading-5 text-secondary/55">
        {description}
      </p>
      {action ? (
        <Link
          href={action.href}
          className="mt-3 inline-flex items-center justify-center rounded-full bg-secondary px-4 py-2 text-xs font-medium text-white transition hover:bg-secondary/90"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-[20px] border border-black/5 bg-card p-4 shadow-[0_14px_30px_rgba(8,15,23,0.05)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-secondary/45">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-secondary">
        {value}
      </p>
      {note ? <p className="mt-1 text-xs text-primary">{note}</p> : null}
    </div>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "rose" | "slate" | "blue";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    rose: "bg-rose-500/10 text-rose-700",
    slate: "bg-black/5 text-secondary/60",
    blue: "bg-blue-500/10 text-blue-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function DataTable({
  headers,
  rows,
  empty,
  page,
  itemsPerPage,
  setPage,
  totalItems,
  totalPages,
}: {
  headers: string[];
  rows: ReactNode[][];
  empty?: ReactNode;
  page?: number;
  setPage?: Dispatch<SetStateAction<number>>;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-[22px] border border-black/5 bg-white">
        {empty ?? (
          <div className="px-6 py-10 text-center text-xs text-secondary/45">
            No records found.
          </div>
        )}
      </div>
    );
  }

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (!totalPages || !page) return pages;
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }
    return pages;
  };
  const startItem = ((page ?? 1) - 1) * (itemsPerPage ?? 1) + 1;
  const endItem = Math.min((page ?? 1) * (itemsPerPage ?? 1), totalItems ?? 0);

  return (
    <>
      <div className="overflow-hidden rounded-[22px] border border-black/5 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-black/3 text-[11px] font-medium uppercase tracking-[0.14em] text-secondary/45">
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-black/5 last:border-b-0"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-4 align-middle ${
                        cellIndex === 0
                          ? "font-medium text-secondary"
                          : "text-secondary/70"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {!totalPages || totalPages <= 1 ? null : (
        <Pagination>
          <Pagination.Summary>
            Showing {startItem}-{endItem} of {totalItems} results
          </Pagination.Summary>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous
                isDisabled={page === 1}
                onPress={() => setPage?.((p: number) => p - 1)}
              >
                <Pagination.PreviousIcon />
                <span>Previous</span>
              </Pagination.Previous>
            </Pagination.Item>
            {getPageNumbers().map((p, i) =>
              p === "ellipsis" ? (
                <Pagination.Item key={`ellipsis-${i}`}>
                  <Pagination.Ellipsis />
                </Pagination.Item>
              ) : (
                <Pagination.Item key={p}>
                  <Pagination.Link
                    isActive={p === page}
                    onPress={() => setPage?.(p)}
                    className=""
                  >
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ),
            )}
            <Pagination.Item>
              <Pagination.Next
                isDisabled={page === totalPages}
                onPress={() => setPage?.((p) => p + 1)}
              >
                <span>Next</span>
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      )}
    </>
  );
}
