import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("enclaws", 16)).toBe("enclaws");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("enclaws-status-output", 10)).toBe("enclaws-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});
