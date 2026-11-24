import { importWithReload } from "./lazy-reload";
import type { Roadmap } from "./mizan";
import { roadmapMarkdown } from "./mizan";

// Browser-only event helper; include every section, independent of expanded UI state.
export async function exportRoadmapPDF(roadmap: Roadmap) {
  const { jsPDF } = await importWithReload(() => import("jspdf"));
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  let y = margin;
  pdf.setFont("helvetica", "normal");
  const content = roadmapMarkdown(roadmap).replace(/–|—/g, "-").replace(/’/g, "'");
  for (const raw of content.split("\n")) {
    const heading = raw.startsWith("#");
    pdf.setFontSize(heading ? (raw.startsWith("# ") ? 18 : 13) : 10);
    pdf.setFont("helvetica", heading ? "bold" : "normal");
    const lines = pdf.splitTextToSize(
      raw.replace(/^#{1,3}\s*/, "").replace(/\*\*/g, ""),
      174,
    ) as string[];
    for (const line of lines) {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += heading ? 7 : 5;
    }
    if (!raw) y += 2;
  }
  pdf.save(`${roadmap.title}.pdf`);
}
