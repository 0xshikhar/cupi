/** @jest-environment node */
import { describe, expect, it } from "@jest/globals";
import { isAddress } from "viem";

describe("Handle, Phone, and Address Directory Resolution Logic", () => {
  it("should validate and recognize valid EVM addresses", () => {
    const validAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    expect(isAddress(validAddress)).toBe(true);

    const invalidAddress = "0xinvalidaddress";
    expect(isAddress(invalidAddress)).toBe(false);
  });

  it("should normalize handles by stripping leading @ and trimming", () => {
    const rawHandles = ["@alice", "  @bob ", "charlie"];
    const normalized = rawHandles.map((h) =>
      h.trim().startsWith("@") ? h.trim().slice(1) : h.trim()
    );

    expect(normalized).toEqual(["alice", "bob", "charlie"]);
  });

  it("should normalize international phone numbers by stripping whitespace and non-digits except +", () => {
    const rawPhones = ["+91 98765 43210", "+1 (555) 234-5678", "  +44-20-7946-0958  "];
    const normalized = rawPhones.map((p) => p.replace(/[^\d+]/g, ""));

    expect(normalized).toEqual(["+919876543210", "+15552345678", "+442079460958"]);
    expect(normalized.every((p) => p.length >= 10)).toBe(true);
  });
});
