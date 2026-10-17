import { describe, expect, it } from "vitest";
import { parsePageRanges, parsePageRangeIndices } from "@/lib/pdf-utils";
import { parseRanges } from "@/lib/pdf-split";

describe("parsePageRanges", () => {
  it("parses single pages and ranges, sorted and de-duplicated", () => {
    expect(parsePageRanges("3, 1-2, 2", 10)).toEqual([1, 2, 3]);
  });

  it("clamps ranges to the document length", () => {
    expect(parsePageRanges("4-99", 5)).toEqual([4, 5]);
  });

  it("rejects malformed input", () => {
    expect(() => parsePageRanges("a-b", 5)).toThrow(/Invalid page/);
    expect(() => parsePageRanges("4-2", 5)).toThrow(/Invalid range/);
  });

  it("converts to 0-based indices", () => {
    expect(parsePageRangeIndices("1, 3", 3)).toEqual([0, 2]);
  });

  it("splits into one group per comma token", () => {
    expect(parseRanges("1-2, 4", 5)).toEqual([[0, 1], [3]]);
  });
});
