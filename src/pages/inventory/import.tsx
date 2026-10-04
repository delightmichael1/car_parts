"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdUploadFile,
  MdCheckCircle,
  MdWarningAmber,
  MdCloudUpload,
  MdClose,
  MdSwapHoriz,
  MdTableChart,
  MdDoneAll,
} from "react-icons/md";
import DashboardLayout from "@/layout/DashboardLayout";
import { OperationsPage } from "@/components/shared/OperationsPage";
import {
  DataTable,
  EmptyState,
  LoadingState,
  MetricCard,
  StatusBadge,
} from "@/components/shared/PageState";
import { AppModal } from "@/components/shared/AppModal";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import { Product, ProductsResponse } from "@/types/types";

type FieldKey =
  | "partNumber"
  | "quantity"
  | "name"
  | "sku"
  | "oemNumber"
  | "description"
  | "costPrice"
  | "sellingPrice"
  | "unit";
type Mapping = Partial<Record<FieldKey, number>>;
type LineStatus = "MATCHED" | "NEW" | "INVALID" | "AMBIGUOUS";

interface ImportLine {
  rows: number[];
  partNumber: string;
  quantity: number;
  status: LineStatus;
  issues: string[];
  productName?: string;
  sku?: string;
  quantityBefore: number;
  quantityAfter: number;
  newProduct?: { name: string; sku: string; missingFields: string[] };
}

interface Analysis {
  fileName: string;
  sheets: string[];
  sheet: string;
  headerRow: number;
  headers: string[];
  sample: string[][];
  mapping: Mapping;
  warnings: string[];
  summary: {
    matched: number;
    created: number;
    skipped: number;
    units: number;
    ignoredRows: number;
  };
  lines: ImportLine[];
  previousImport?: { at: string; fileName: string } | null;
}

interface CommitResult {
  batchId: string;
  updated: number;
  created: number;
  skipped: number;
  units: number;
}

type ReviewProduct = Product & {
  needsReview?: boolean;
  importBatchId?: string;
};

const FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "partNumber", label: "Part number", required: true },
  { key: "quantity", label: "Quantity received", required: true },
  { key: "name", label: "Product name" },
  { key: "sku", label: "SKU" },
  { key: "oemNumber", label: "OEM number" },
  { key: "description", label: "Description" },
  { key: "costPrice", label: "Cost price" },
  { key: "sellingPrice", label: "Selling price" },
  { key: "unit", label: "Unit" },
];

const PAGE_SIZE = 25;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXT = [".xlsx", ".xlsm", ".csv", ".tsv", ".txt"];

const colLetter = (i: number) => {
  let n = i;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileExt = (name: string) => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
};

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-secondary outline-none focus:border-secondary";

function buildForm(
  file: File,
  opts: {
    sheet?: string;
    headerRow?: number | null;
    mapping?: Mapping;
    force?: boolean;
  },
) {
  const fd = new FormData();
  fd.append("file", file);
  if (opts.sheet) fd.append("sheet", opts.sheet);
  if (opts.headerRow) fd.append("headerRow", String(opts.headerRow));
  if (opts.mapping) fd.append("mapping", JSON.stringify(opts.mapping));
  if (opts.force) fd.append("force", "true");
  return fd;
}

// ---------------------------------------------------------------------------
// Drag & drop upload zone
// ---------------------------------------------------------------------------

function Dropzone({
  file,
  isAnalyzing,
  error,
  onFile,
  onClear,
}: {
  file: File | null;
  isAnalyzing: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = "";
  }, [file]);

  const accept = (f: File | null | undefined) => {
    if (!f) return;
    if (!ACCEPTED_EXT.includes(fileExt(f.name))) {
      setLocalError(
        "That file type isn't supported. Upload an .xlsx or .csv file (save older .xls files as .xlsx first).",
      );
      return;
    }
    if (f.size > MAX_BYTES) {
      setLocalError("That file is too large. The maximum size is 10 MB.");
      return;
    }
    setLocalError(null);
    onFile(f);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    accept(e.dataTransfer.files?.[0]);
  };

  const openPicker = () => inputRef.current?.click();
  const shownError = localError ?? error;

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_EXT.join(",")}
      className="hidden"
      onChange={(e) => {
        accept(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  // ----- File chosen: compact card (still accepts a replacement drop) -----
  if (file) {
    return (
      <section
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition-all duration-200 md:p-5 ${
          isDragging
            ? "border-primary bg-primary/5 ring-4 ring-primary/15"
            : "border-black/10"
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MdTableChart className="h-7 w-7" />
            <span className="absolute -bottom-1 -right-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              {fileExt(file.name).replace(".", "") || "file"}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-secondary">
              {file.name}
            </p>
            <p className="mt-0.5 text-xs text-secondary/55">
              {isDragging
                ? "Drop to replace this file"
                : isAnalyzing
                  ? "Reading spreadsheet…"
                  : `${formatBytes(file.size)} · ready to review`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={isAnalyzing}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-secondary transition hover:bg-black/5 disabled:opacity-50"
            >
              <MdSwapHoriz className="h-4 w-4" />
              Replace
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={isAnalyzing}
              aria-label="Remove file"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-secondary/60 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            >
              <MdClose className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isAnalyzing ? (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          </div>
        ) : null}

        {shownError ? (
          <p className="mt-3 text-sm font-medium text-rose-600">{shownError}</p>
        ) : null}
        {hiddenInput}
      </section>
    );
  }

  // ----- Empty: full drop zone -----
  return (
    <section className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a spreadsheet. Click or drag and drop a file."
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`group relative flex cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-14 text-center outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-primary/20 md:py-20 ${
          isDragging
            ? "scale-[1.01] border-primary bg-primary/5 shadow-xl shadow-primary/10"
            : "border-black/15 bg-gradient-to-b from-white to-black/[0.02] hover:border-primary/60 hover:shadow-lg"
        }`}
      >
        {/* soft decorative glow */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.04),transparent_60%)] transition-opacity duration-300 ${
            isDragging ? "opacity-0" : "opacity-100"
          }`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary,#f59e0b)_0%,transparent_65%)] transition-opacity duration-300 ${
            isDragging ? "opacity-10" : "opacity-0"
          }`}
        />

        {/* icon */}
        <div className="relative">
          {isDragging ? (
            <span
              aria-hidden
              className="absolute inset-0 animate-ping rounded-full bg-primary/25"
            />
          ) : null}
          <div
            className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
              isDragging
                ? "-translate-y-1 scale-110 bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-secondary text-white shadow-md group-hover:-translate-y-0.5 group-hover:shadow-lg"
            }`}
          >
            <MdCloudUpload
              className={`h-10 w-10 transition-transform duration-300 ${
                isDragging ? "animate-bounce" : ""
              }`}
            />
          </div>
        </div>

        {/* copy */}
        <div className="relative flex flex-col gap-1.5">
          <h3 className="text-xl font-semibold tracking-tight text-secondary md:text-2xl">
            {isDragging ? "Drop it right here" : "Drag & drop your spreadsheet"}
          </h3>
          <p className="text-sm text-secondary/55">
            {isDragging ? (
              "Release to start reading the file"
            ) : (
              <>
                or{" "}
                <span className="font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition group-hover:decoration-primary">
                  browse your files
                </span>{" "}
                to upload
              </>
            )}
          </p>
        </div>

        {/* format chips */}
        <div className="relative flex flex-wrap items-center justify-center gap-2">
          {[".xlsx", ".csv", ".tsv"].map((ext) => (
            <span
              key={ext}
              className="rounded-full border border-black/10 bg-white px-3 py-1 font-mono text-[11px] font-semibold text-secondary/60"
            >
              {ext}
            </span>
          ))}
          <span className="text-[11px] text-secondary/45">· up to 10 MB</span>
        </div>

        {hiddenInput}
      </div>

      {shownError ? (
        <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          <MdWarningAmber className="mt-0.5 shrink-0" />
          {shownError}
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ImportStockPage() {
  const { secureAxios } = useAxios();

  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [sheet, setSheet] = useState("");
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [reimport, setReimport] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "MATCHED" | "NEW" | "SKIPPED">(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [reviewVersion, setReviewVersion] = useState(0);

  const analyze = async (
    f: File,
    opts: { sheet?: string; headerRow?: number | null; mapping?: Mapping },
  ) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await secureAxios.post<Analysis>(
        "/inventory/import/analyze",
        buildForm(f, opts),
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setAnalysis(res.data);
      setMapping(res.data.mapping ?? {});
      setSheet(res.data.sheet);
      setHeaderRow(res.data.headerRow);
      setPage(1);
      setFilter("ALL");
    } catch (e: unknown) {
      setAnalysis(null);
      setError(apiErrorMessage(e, "Couldn't read that spreadsheet."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onFile = (f: File) => {
    setFile(f);
    setResult(null);
    setReimport(false);
    analyze(f, {});
  };

  const onMappingChange = (field: FieldKey, value: string) => {
    if (!file) return;
    const next: Mapping = { ...mapping };
    if (value === "") delete next[field];
    else {
      const col = Number(value);
      // A column can only feed one field.
      (Object.keys(next) as FieldKey[]).forEach((k) => {
        if (next[k] === col) delete next[k];
      });
      next[field] = col;
    }
    analyze(file, { sheet, headerRow, mapping: next });
  };

  const commit = async () => {
    if (!file || !analysis) return;
    setIsCommitting(true);
    setError(null);
    try {
      const res = await secureAxios.post<CommitResult>(
        "/inventory/import/commit",
        buildForm(file, { sheet, headerRow, mapping, force: reimport }),
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setResult(res.data);
      setAnalysis(null);
      setFile(null);
      setReviewVersion((v) => v + 1);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, "Import failed. Nothing was changed."));
    } finally {
      setIsCommitting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setResult(null);
    setError(null);
    setReimport(false);
  };

  const filtered = useMemo(() => {
    const lines = analysis?.lines ?? [];
    switch (filter) {
      case "MATCHED":
        return lines.filter((l) => l.status === "MATCHED");
      case "NEW":
        return lines.filter((l) => l.status === "NEW");
      case "SKIPPED":
        return lines.filter(
          (l) => l.status === "INVALID" || l.status === "AMBIGUOUS",
        );
      default:
        return lines;
    }
  }, [analysis, filter]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const missingRequired = FIELDS.filter(
    (f) => f.required && mapping[f.key] === undefined,
  );
  const canCommit =
    !!analysis &&
    !isAnalyzing &&
    !isCommitting &&
    missingRequired.length === 0 &&
    analysis.summary.matched + analysis.summary.created > 0 &&
    (!analysis.previousImport || reimport);

  return (
    <DashboardLayout>
      <OperationsPage
        title="Import received stock"
        eyebrow="Inventory"
        description="Upload a delivery spreadsheet. Parts are matched by part number; unknown parts are added as new products for you to review."
      >
        <div className="flex flex-col gap-6">
          {/* Step 1: upload */}
          {!result ? (
            <Dropzone
              file={file}
              isAnalyzing={isAnalyzing}
              error={error && !analysis ? error : null}
              onFile={onFile}
              onClear={reset}
            />
          ) : (
            <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-emerald-800">
                <MdCheckCircle className="h-6 w-6" />
                <h2 className="text-lg font-semibold">Import complete</h2>
              </div>
              <p className="text-sm text-emerald-900">
                {result.updated} existing products received stock,{" "}
                {result.created} new products were created, {result.units} units
                added in total
                {result.skipped > 0
                  ? `. ${result.skipped} rows were skipped.`
                  : "."}
              </p>
              <div>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-secondary hover:bg-black/5"
                >
                  <MdUploadFile />
                  Import another file
                </button>
              </div>
            </section>
          )}

          {/* Step 2: map + preview */}
          {analysis ? (
            <>
              <section className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5">
                <h2 className="text-lg font-semibold text-secondary">
                  1. Check the columns
                </h2>
                <div className="flex flex-wrap gap-4">
                  {analysis.sheets.length > 1 ? (
                    <label className="flex flex-col gap-1 text-sm font-medium text-secondary">
                      Sheet
                      <select
                        className={inputClass}
                        value={sheet}
                        onChange={(e) =>
                          file && analyze(file, { sheet: e.target.value })
                        }
                      >
                        {analysis.sheets.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="flex flex-col gap-1 text-sm font-medium text-secondary">
                    Header row number
                    <input
                      className={`${inputClass} w-28`}
                      type="number"
                      min={1}
                      defaultValue={analysis.headerRow}
                      key={`${analysis.sheet}-${analysis.headerRow}`}
                      onBlur={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        if (file && n >= 1 && n !== analysis.headerRow)
                          analyze(file, { sheet, headerRow: n });
                      }}
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {FIELDS.map((f) => {
                    const idx = mapping[f.key];
                    const example =
                      idx !== undefined ? analysis.sample[0]?.[idx] : "";
                    const isMissing = f.required && idx === undefined;
                    return (
                      <label
                        key={f.key}
                        className="flex flex-col gap-1 text-sm font-medium text-secondary"
                      >
                        <span>
                          {f.label}
                          {f.required ? (
                            <span className="text-primary"> *</span>
                          ) : null}
                        </span>
                        <select
                          className={`${inputClass} ${isMissing ? "border-rose-400" : ""}`}
                          value={idx === undefined ? "" : String(idx)}
                          onChange={(e) =>
                            onMappingChange(f.key, e.target.value)
                          }
                        >
                          <option value="">— not in this sheet —</option>
                          {analysis.headers.map((h, i) => (
                            <option key={i} value={i}>
                              {colLetter(i)}: {h || "(blank)"}
                            </option>
                          ))}
                        </select>
                        <span className="min-h-4 text-[11px] font-normal text-secondary/50">
                          {example ? `e.g. ${example}` : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {analysis.warnings?.map((w) => (
                  <p
                    key={w}
                    className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  >
                    <MdWarningAmber className="mt-0.5 shrink-0" />
                    {w}
                  </p>
                ))}
              </section>

              <section className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-secondary">
                  2. Review what will happen
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Existing products"
                    value={String(analysis.summary.matched)}
                    note="Stock will be added"
                  />
                  <MetricCard
                    label="New products"
                    value={String(analysis.summary.created)}
                    note="Created for review"
                  />
                  <MetricCard
                    label="Skipped rows"
                    value={String(analysis.summary.skipped)}
                    note="Not imported"
                  />
                  <MetricCard
                    label="Units to add"
                    value={String(analysis.summary.units)}
                    note="Across valid rows"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["ALL", "All"],
                      ["MATCHED", "Existing"],
                      ["NEW", "New"],
                      ["SKIPPED", "Skipped"],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setFilter(k);
                        setPage(1);
                      }}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                        filter === k
                          ? "bg-secondary text-white"
                          : "bg-black/5 text-secondary/70 hover:bg-black/10"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <DataTable
                  headers={[
                    "Part number",
                    "Sheet rows",
                    "Qty in",
                    "Stock",
                    "Result",
                  ]}
                  empty={
                    <EmptyState
                      title="Nothing to show"
                      description="Map the part number and quantity columns to see a preview."
                    />
                  }
                  itemsPerPage={PAGE_SIZE}
                  page={page}
                  setPage={setPage}
                  totalPages={Math.ceil(filtered.length / PAGE_SIZE)}
                  totalItems={filtered.length}
                  rows={pageRows.map((l) => [
                    <div key="p" className="min-w-0">
                      <p className="truncate font-medium text-secondary">
                        {l.partNumber || "—"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-secondary/45">
                        {l.status === "NEW"
                          ? (l.newProduct?.name ?? "")
                          : (l.productName ?? "")}
                      </p>
                    </div>,
                    <span key="r" className="text-secondary/70">
                      {l.rows.join(", ")}
                    </span>,
                    <span key="q" className="font-semibold text-secondary">
                      {l.quantity || "—"}
                    </span>,
                    <span key="s" className="text-secondary/70">
                      {l.status === "MATCHED" || l.status === "NEW"
                        ? `${l.quantityBefore} → ${l.quantityAfter}`
                        : "—"}
                    </span>,
                    <div key="st" className="flex flex-col items-start gap-1">
                      <StatusBadge
                        tone={
                          l.status === "MATCHED"
                            ? "emerald"
                            : l.status === "NEW"
                              ? "blue"
                              : l.status === "AMBIGUOUS"
                                ? "amber"
                                : "rose"
                        }
                      >
                        {l.status === "MATCHED"
                          ? "Existing"
                          : l.status === "NEW"
                            ? "New product"
                            : l.status === "AMBIGUOUS"
                              ? "Ambiguous"
                              : "Skipped"}
                      </StatusBadge>
                      {l.issues.map((i) => (
                        <span key={i} className="text-[11px] text-secondary/60">
                          {i}
                        </span>
                      ))}
                    </div>,
                  ])}
                />

                {analysis.previousImport ? (
                  <label className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-900">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={reimport}
                      onChange={(e) => setReimport(e.target.checked)}
                    />
                    This exact file was already imported on{" "}
                    {new Date(analysis.previousImport.at).toLocaleString()}.
                    Tick to import it again (stock will be added twice).
                  </label>
                ) : null}

                {analysis.summary.skipped > 0 ? (
                  <p className="text-sm text-secondary/70">
                    {analysis.summary.skipped} skipped row(s) will not be
                    imported. Fix them in the spreadsheet and upload again if
                    they matter.
                  </p>
                ) : null}

                {error ? (
                  <p className="text-sm font-medium text-rose-600">{error}</p>
                ) : null}

                <div>
                  <button
                    type="button"
                    onClick={commit}
                    disabled={!canCommit}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-secondary px-6 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-50"
                  >
                    {isCommitting
                      ? "Importing…"
                      : `Import ${analysis.summary.matched + analysis.summary.created} products`}
                  </button>
                </div>
              </section>
            </>
          ) : null}

          <NewProductsReview
            version={reviewVersion}
            batchId={result?.batchId}
          />
        </div>
      </OperationsPage>
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Review of products created by imports
// ---------------------------------------------------------------------------

function NewProductsReview({
  version,
  batchId,
}: {
  version: number;
  batchId?: string;
}) {
  const { secureAxios } = useAxios();
  const [products, setProducts] = useState<ReviewProduct[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await secureAxios.get<ProductsResponse>("/products", {
          params: { needsReview: "true", page: 1, limit: 100 },
        });
        if (!cancelled) {
          setProducts(res.data.products as ReviewProduct[]);
          setTotal(res.data.total);
          setLoadError(null);
        }
      } catch (e: unknown) {
        if (!cancelled)
          setLoadError(apiErrorMessage(e, "Couldn't load new products."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const closeConfirm = () => {
    if (isMarking) return;
    setIsConfirmOpen(false);
    setMarkError(null);
  };

  const markAllReviewed = async () => {
    setIsMarking(true);
    setMarkError(null);
    try {
      await secureAxios.post("/products/mark-reviewed", {});
      setProducts([]);
      setTotal(0);
      setIsConfirmOpen(false);
    } catch (e: unknown) {
      setMarkError(
        apiErrorMessage(e, "Couldn't mark the products as reviewed."),
      );
    } finally {
      setIsMarking(false);
    }
  };

  if (loadError) {
    return <p className="text-sm font-medium text-rose-600">{loadError}</p>;
  }
  if (products === null) return <LoadingState label="Loading new products…" />;
  if (products.length === 0) return null;

  const zeroPriceShown = products.filter(
    (p) => !(Number(p.sellingPrice) > 0),
  ).length;

  return (
    <section id="review" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-secondary">
            New products to review ({total})
          </h2>
          <p className="max-w-2xl text-sm text-secondary/60">
            These were created from imported spreadsheets. Fix anything the
            sheet didn&apos;t provide (highlighted in amber), then save to mark
            each as reviewed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold text-secondary transition hover:bg-black/5"
        >
          <MdDoneAll className="h-5 w-5" />
          Mark all as reviewed
        </button>
      </div>

      {products.map((p) => (
        <ReviewRow
          key={p.id}
          product={p}
          isFromBatch={!!batchId && p.importBatchId === batchId}
          onSaved={(id) => {
            setProducts((cur) => (cur ?? []).filter((x) => x.id !== id));
            setTotal((t) => Math.max(0, t - 1));
          }}
        />
      ))}

      {isConfirmOpen ? (
        <AppModal
          isOpen
          onClose={closeConfirm}
          icon={<MdDoneAll className="h-5 w-5" />}
          title="Mark all as reviewed?"
          subtitle={`This clears the review flag on ${total} product${total === 1 ? "" : "s"}.`}
          footer={
            <div className="flex w-full flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={markAllReviewed}
                disabled={isMarking}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
              >
                <MdDoneAll />
                {isMarking ? "Marking…" : "Yes, mark all reviewed"}
              </button>
              <button
                type="button"
                onClick={closeConfirm}
                disabled={isMarking}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white text-sm font-semibold text-secondary transition hover:bg-black/5 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          }
        >
          <p className="text-sm leading-6 text-secondary/70">
            Names, SKUs and prices stay exactly as they were imported. Any edits
            you have typed into the fields but not saved will be lost.
          </p>

          {zeroPriceShown > 0 ? (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <MdWarningAmber className="mt-0.5 shrink-0" />
              {zeroPriceShown} of the products shown still have a 0.00 selling
              price.
            </p>
          ) : null}

          {markError ? (
            <p className="text-sm font-medium text-rose-600">{markError}</p>
          ) : null}
        </AppModal>
      ) : null}
    </section>
  );
}

function ReviewRow({
  product,
  isFromBatch,
  onSaved,
}: {
  product: ReviewProduct;
  isFromBatch: boolean;
  onSaved: (id: string) => void;
}) {
  const { secureAxios } = useAxios();
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [cost, setCost] = useState(product.costPrice);
  const [price, setPrice] = useState(product.sellingPrice);
  const [minStock, setMinStock] = useState(String(product.minimumStockLevel));
  const [unit, setUnit] = useState(product.unit ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isZero = (v: string) => !(Number(v) > 0);
  const warn = "border-amber-400 bg-amber-50";
  const nameLooksGenerated = name.startsWith("Part ");

  const save = async () => {
    const money = /^\d+(\.\d{1,2})?$/;
    if (!name.trim() || !sku.trim()) {
      setError("Name and SKU are required.");
      return;
    }
    if (!money.test(cost) || !money.test(price)) {
      setError("Prices must be numbers like 12.50.");
      return;
    }
    const min = Number.parseInt(minStock, 10);
    if (!Number.isFinite(min) || min < 0) {
      setError("Minimum stock must be 0 or more.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await secureAxios.patch(`/products/${product.id}`, {
        sku: sku.trim(),
        name: name.trim(),
        costPrice: cost,
        sellingPrice: price,
        minimumStockLevel: min,
        unit: unit.trim(),
        needsReview: false,
      });
      onSaved(product.id);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, "Couldn't save this product."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${
        isFromBatch
          ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-200"
          : "border-amber-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="amber">
          {isFromBatch ? "Just added" : "Needs review"}
        </StatusBadge>
        <span className="text-sm font-semibold text-secondary">
          Part {product.partNumber || "—"}
        </span>
        <span className="text-xs text-secondary/55">
          · {product.quantity} in stock
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary/70">
          Name
          <input
            className={`${inputClass} ${nameLooksGenerated ? warn : ""}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary/70">
          SKU
          <input
            className={inputClass}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary/70">
          Unit
          <input
            className={inputClass}
            value={unit}
            placeholder="e.g. pcs"
            onChange={(e) => setUnit(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary/70">
          Cost price
          <input
            className={`${inputClass} ${isZero(cost) ? warn : ""}`}
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary/70">
          Selling price
          <input
            className={`${inputClass} ${isZero(price) ? warn : ""}`}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary/70">
          Reorder at (minimum stock)
          <input
            className={inputClass}
            type="number"
            min={0}
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : null}

      <div>
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="rounded-2xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save & mark reviewed"}
        </button>
      </div>
    </div>
  );
}
