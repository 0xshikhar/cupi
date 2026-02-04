/** @jest-environment node */
import { describe, expect, it } from "@jest/globals";
import { Keypair } from "@solana/web3.js";
import { GET, POST } from "../pay/route";

describe("Solana Pay Transaction Request API", () => {
  it("should return human-readable label and metadata on GET", async () => {
    const req = new Request("http://localhost:3000/api/solana/pay?amount=15&memo=Lunch");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.label).toContain("15");
    expect(data.title).toContain("15");
    expect(data.icon).toBeDefined();
    expect(data.disabled).toBe(false);
  });

  it("should reject POST when payer account is missing", async () => {
    const req = new Request("http://localhost:3000/api/solana/pay?recipient=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing 'account'");
  });

  it("should reject POST when recipient is missing from search params", async () => {
    const payer = Keypair.generate().publicKey.toBase58();
    const req = new Request("http://localhost:3000/api/solana/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: payer }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("recipient parameter is required");
  });
});
