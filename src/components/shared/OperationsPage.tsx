import Link from "next/link";
import { ReactNode } from "react";
import { MdAdd, MdArrowForward, MdSearch } from "react-icons/md";

export type OperationsPageProps = { title: string; eyebrow?: string; description: string; action?: { label: string; href: string }; children?: ReactNode };

export function OperationsPage({ title, eyebrow = "Operations", description, action, children }: OperationsPageProps) {
  return <div className="flex flex-col gap-6 p-5 pb-10 md:p-8">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2"><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</span><h1 className="text-3xl font-semibold tracking-tight text-secondary md:text-4xl">{title}</h1><p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>
      {action && <Link href={action.href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary px-5 text-sm font-semibold text-background transition hover:bg-secondary/90"><MdAdd />{action.label}</Link>}
    </header>{children}
  </div>;
}

export function MetricStrip({ items }: { items: { label: string; value: string; note: string }[] }) { return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <div key={item.label} className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-2 text-2xl font-semibold text-secondary">{item.value}</p><p className="mt-1 text-xs text-primary">{item.note}</p></div>)}</div>; }

export function TableCard({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-hidden rounded-3xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold text-secondary">Latest activity</h2><p className="text-xs text-muted-foreground">Live operational records</p></div><button aria-label="Search records" className="flex size-10 items-center justify-center rounded-xl bg-background-2 text-secondary"><MdSearch /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-background-2 text-xs text-muted-foreground"><tr>{headers.map((header) => <th className="px-5 py-3 font-medium" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr className="border-t border-border" key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td className={`px-5 py-4 ${cellIndex === row.length - 1 ? "font-semibold text-secondary" : "text-muted-foreground"}`} key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></div>; }

export function QuickLinks({ links }: { links: { label: string; href: string; detail: string }[] }) { return <div className="grid gap-3 md:grid-cols-3">{links.map((link) => <Link href={link.href} key={link.href} className="group rounded-2xl bg-secondary p-5 text-background transition hover:-translate-y-0.5"><div className="flex items-center justify-between"><span className="font-semibold">{link.label}</span><MdArrowForward className="transition group-hover:translate-x-1" /></div><p className="mt-2 text-xs leading-5 text-background/60">{link.detail}</p></Link>)}</div>; }
