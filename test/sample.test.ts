import "@wdio/globals/types";
import "./loadUi5.js";
import { expect } from "@wdio/globals";

describe("Sample", () => {
  it("should work", async () => {
    expect(5).toEqual(5);
  });
});
