"use client";

import { useState } from "react";
import { Card, EmptyState } from "@/components/os/ui";

export type Report = {
  key: string;
  title: string;
  columns: string[];
  rows: (string | number)[][];
};

function toCSV(columns: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient({ reports }: { reports: Report[] }) {
  const [active, setActive] = useState(reports[0]?.key ?? "");
  const report = reports.find((r) => r.key === active);

  const date = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Reports</h1>
          <p className="text-sm text-muted">Export any dataset to Excel (CSV) or print to PDF.</p>
        </div>
        {report && report.rows.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => download(`techxfluence-${report.key}-${date}.csv`, toCSV(report.columns, report.rows))}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              ↓ Download CSV
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted hover:text-fg"
            >
              Print / PDF
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {reports.map((r) => (
          <button
            key={r.key}
            onClick={() => setActive(r.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active === r.key ? "bg-brand text-white" : "border border-line bg-surface text-muted hover:text-fg"
            }`}
          >
            {r.title}
            <span className={`ml-1.5 rounded-full px-1.5 text-[10px] ${active === r.key ? "bg-white/25" : "bg-ink-2"}`}>
              {r.rows.length}
            </span>
          </button>
        ))}
      </div>

      {!report || report.rows.length === 0 ? (
        <EmptyState title="No data for this report yet" hint="Add records in the relevant module first." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
                {report.columns.map((c) => (
                  <th key={c} className="px-3 py-3 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.slice(0, 200).map((row, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2.5 text-muted">{String(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {report.rows.length > 200 && (
            <p className="px-3 py-2 text-xs text-faint">Showing first 200 rows — CSV export includes all {report.rows.length}.</p>
          )}
        </Card>
      )}
    </>
  );
}
