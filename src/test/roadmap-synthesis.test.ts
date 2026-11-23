import { describe, it, expect } from "vitest";
import {
  estimatedTranscript,
  transcriptIntervals,
  validateConsolidatedRoadmap,
  type Roadmap,
} from "@/lib/mizan";
import { SAMPLE_ROADMAP } from "@/lib/sample-roadmap";
function example(): Roadmap {
  const r = structuredClone(SAMPLE_ROADMAP);
  const first = r.phases[0]?.concepts[0];
  if (!first) throw new Error("Missing fixture concept");
  first.sources = [
    { videoId: "W6NZfCO5SIk", title: "JavaScript", start: 0, end: 120 },
    { videoId: "dQw4w9WgXcQ", title: "Second source", start: 100, end: 200 },
  ];
  return r;
}
const sources = [
  { video: { id: "W6NZfCO5SIk", duration: 2800 }, ranges: [[0, 360]] as [number, number][] },
  { video: { id: "dQw4w9WgXcQ", duration: 220 }, ranges: [[100, 200]] as [number, number][] },
];
describe("One unified playlist roadmap", () => {
  it("accepts two videos merged into one concept across four phases", () => {
    expect(() => validateConsolidatedRoadmap(example(), sources)).not.toThrow();
    expect(example().phases).toHaveLength(4);
  });
  it("rejects a playlist course missing any video", () => {
    const r = example();
    const c = r.phases[0]?.concepts[0];
    if (!c) throw new Error("Missing concept");
    c.sources = c.sources.filter((s) => s.videoId !== "dQw4w9WgXcQ");
    expect(() => validateConsolidatedRoadmap(r, sources)).toThrow("missing");
  });
  it("rejects timestamps outside the supplied transcript even if within video duration", () => {
    const r = example();
    const s = r.phases[0]?.concepts[0]?.sources[0];
    if (!s) throw new Error("Missing source");
    s.end = 500;
    expect(() => validateConsolidatedRoadmap(r, sources)).toThrow("beyond the supplied transcript");
  });
  it("rejects duplicated concepts", () => {
    const r = example();
    const c = r.phases[0]?.concepts[0];
    if (!c) throw new Error("Missing concept");
    r.phases[1]?.concepts.push(structuredClone(c));
    expect(() => validateConsolidatedRoadmap(r, sources)).toThrow("duplicate");
  });
  it("rejects phases in video order rather than dependency order", () => {
    const r = example();
    r.phases.reverse();
    expect(() => validateConsolidatedRoadmap(r, sources)).toThrow("dependency-ordered");
  });
  it("retains exact timestamp intervals in manual transcripts", () => {
    expect(transcriptIntervals("[0–120s] Variables\n[120-240] Functions")).toEqual([
      [0, 120],
      [120, 240],
    ]);
  });
});
describe("estimatedTranscript", () => {
  it("spreads a plain transcript over the video length as timestamped lines", () => {
    const text =
      "First sentence here. Second sentence here. " +
      "Third sentence that runs fairly long and carries more detail. ".repeat(12);
    const lines = estimatedTranscript(text, 600).split("\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toMatch(/^\[0–\d+s\] /);
    expect(lines[lines.length - 1]).toContain("–600s] ");
  });
  it("keeps a short transcript as one estimated range", () => {
    expect(estimatedTranscript("Only one short idea.", 120)).toBe("[0–120s] Only one short idea.");
  });
  it("returns nothing when the audio had no speech", () => {
    expect(estimatedTranscript("   \n ", 300)).toBe("");
  });
});
