import { AGENT_LABEL, formatTimestamp, type AgentType } from "./verdict-types";

interface ReportFinding {
  agent: AgentType;
  severity: string;
  status: string;
  timestamp_ms: number;
  title: string;
  explanation: string;
  evidence: string | null;
  override_note?: string | null;
}

interface ReportInput {
  title: string;
  brandKit: string | null;
  durationMs: number;
  width: number | null;
  height: number | null;
  verdict: string | null;
  summary: string | null;
  degradedReason: string | null;
  scores: Record<string, number>;
  findings: ReportFinding[];
}

const VERDICT_COLOR: Record<string, [number, number, number]> = {
  ship: [16, 150, 100],
  fix: [200, 130, 20],
  escalate: [200, 50, 50],
};

/** Builds and downloads a PDF review report entirely in the browser. */
export async function downloadReviewPdf(r: ReportInput) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(120);
  doc.text("VERDICT · EDITORIAL REVIEW REPORT", M, y);
  y += 26;
  doc.setFontSize(20).setTextColor(20);
  const titleLines = doc.splitTextToSize(r.title, W - M * 2 - 110);
  doc.text(titleLines, M, y);

  const v = (r.verdict ?? "pending").toLowerCase();
  const c = VERDICT_COLOR[v] ?? [110, 110, 110];
  doc.setFillColor(c[0], c[1], c[2]);
  doc.roundedRect(W - M - 96, y - 18, 96, 26, 6, 6, "F");
  doc.setFontSize(12).setTextColor(255);
  doc.text(v.toUpperCase(), W - M - 48, y, { align: "center" });

  y += titleLines.length * 22;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(110);
  doc.text(
    `${r.brandKit ?? "No brand kit"}  ·  ${formatTimestamp(r.durationMs)}  ·  ${r.width ?? "?"}×${r.height ?? "?"}  ·  Generated ${new Date().toLocaleString()}`,
    M,
    y,
  );
  y += 24;

  if (r.summary) {
    doc.setFontSize(11).setTextColor(30);
    const lines = doc.splitTextToSize(r.summary, W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 14 + 10;
  }
  if (r.degradedReason) {
    doc.setFontSize(10).setTextColor(180, 110, 20);
    const lines = doc.splitTextToSize(`Partial verdict: ${r.degradedReason}`, W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 13 + 8;
  }

  autoTable(doc, {
    startY: y,
    head: [["Overall", "Technical", "Pacing", "Brand"]],
    body: [[
      ...["overall", "technical", "pacing", "brand"].map((k) =>
        typeof r.scores[k] === "number" ? String(r.scores[k]) : "—",
      ),
    ]],
    theme: "grid",
    styles: { halign: "center", fontSize: 12 },
    headStyles: { fillColor: [24, 24, 28] },
    margin: { left: M, right: M },
  });

  const open = r.findings.filter((f) => f.status === "open").length;
  // @ts-expect-error lastAutoTable is added by the plugin
  y = doc.lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(20);
  doc.text(`Findings (${r.findings.length} total, ${open} open)`, M, y);

  autoTable(doc, {
    startY: y + 10,
    head: [["Time", "Agent", "Severity", "Finding", "Status"]],
    body: r.findings.map((f) => [
      formatTimestamp(f.timestamp_ms),
      AGENT_LABEL[f.agent] ?? f.agent,
      f.severity,
      `${f.title}\n${f.explanation}${f.evidence ? `\nEvidence: ${f.evidence}` : ""}${f.override_note ? `\nEditor note: ${f.override_note}` : ""}`,
      f.status === "approved" ? "Intentional" : f.status === "fix_confirmed" ? "Real fix" : "Open",
    ]),
    theme: "striped",
    styles: { fontSize: 9, valign: "top", cellPadding: 5 },
    headStyles: { fillColor: [24, 24, 28] },
    columnStyles: { 0: { cellWidth: 48, font: "courier" }, 1: { cellWidth: 70 }, 2: { cellWidth: 56 }, 4: { cellWidth: 64 } },
    margin: { left: M, right: M },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(150);
    doc.text(`Verdict review report · page ${i} of ${pages}`, W / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" });
  }

  const safe = r.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "review";
  doc.save(`${safe}_verdict_report.pdf`);
}
