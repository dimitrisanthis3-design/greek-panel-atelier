import { describe, expect, it } from "vitest";
import { paginateCircuitPages } from "./diagram-layout";

describe("paginateCircuitPages", () => {
  it.each([
    [0, 1],
    [1, 1],
    [10, 1],
    [11, 2],
    [20, 2],
    [21, 3],
    [30, 3],
  ])("splits %i circuits into %i sheets", (count, expectedPages) => {
    const pages = paginateCircuitPages(Array.from({ length: count }, (_, i) => `c${i + 1}`));

    expect(pages).toHaveLength(expectedPages);
    expect(pages.every((page) => page.length <= 10)).toBe(true);
    expect(pages.flat()).toHaveLength(count);
  });
});
