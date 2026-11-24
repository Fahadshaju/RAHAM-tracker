import { importWithReload } from "@/lib/lazy-reload";
import { useEffect, useRef, useState } from "react";

// Renders a PDF page by page onto canvases in the page itself, so it works
// even where the browser refuses to show PDFs inside an embedded frame.
export function PdfReader({ url, title }: { url: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let doc: import("pdfjs-dist").PDFDocumentProxy | null = null;
    const el = box.current;
    if (!el) return;
    el.innerHTML = "";
    setState("loading");
    (async () => {
      try {
        const pdfjs = await importWithReload(() => import("pdfjs-dist"));
        const worker = await importWithReload(() => import("pdfjs-dist/build/pdf.worker.min.mjs?url"));
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const pdf = await pdfjs.getDocument({ url: new URL(url, window.location.href).href }).promise;
        doc = pdf;
        if (cancelled) return;
        setPages(pdf.numPages);
        setState("ready");
        const width = el.clientWidth || 800;
        const io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              const c = e.target as HTMLCanvasElement;
              io.unobserve(c);
              const n = Number(c.dataset["page"]);
              pdf.getPage(n).then((page) => {
                const base = page.getViewport({ scale: 1 });
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const vp = page.getViewport({ scale: (width / base.width) * dpr });
                c.width = vp.width;
                c.height = vp.height;
                page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp });
              });
            }
          },
          { rootMargin: "800px" },
        );
        const first = await pdf.getPage(1);
        const ratio = first.getViewport({ scale: 1 }).height / first.getViewport({ scale: 1 }).width;
        for (let i = 1; i <= pdf.numPages; i++) {
          const c = document.createElement("canvas");
          c.dataset["page"] = String(i);
          c.className = "block w-full bg-white rounded-sm shadow mb-3";
          c.style.aspectRatio = `1 / ${ratio}`;
          c.setAttribute("aria-label", `${title}, page ${i}`);
          el.appendChild(c);
          io.observe(c);
        }
      } catch (err) {
        console.error("PDF reader failed", err);
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      void doc?.cleanup();
    };
  }, [url, title]);

  return (
    <div>
      {state === "loading" && <p className="py-10 text-center text-muted-foreground">Opening {title}…</p>}
      {state === "error" && (
        <p className="py-10 text-center text-muted-foreground">
          This part could not be opened. Please try again.
        </p>
      )}
      {state === "ready" && <p className="mb-2 text-sm text-muted-foreground">{pages} pages</p>}
      <div ref={box} className="max-h-[80vh] overflow-y-auto rounded-md" />
    </div>
  );
}
