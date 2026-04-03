import { describe, it, expect } from "vitest";
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { validateEmailReality } from "./email-reality";
import type { EmailRealityDnsResolver } from "./email-reality";

describe("email-reality", () => {
  it("rejects invalid email syntax", async () => {
    const res = await validateEmailReality("not-an-email", undefined);
    expect(res.valid).toBe(false);
  });

  it("rejects temporary/disposable domains (denylist)", async () => {
    const dns: EmailRealityDnsResolver = {
      resolveMx: async () => [{ exchange: "mx.temp", priority: 10 }],
      resolveA: async () => ["127.0.0.1"],
    };
    const res = await validateEmailReality("user@tempmail.com", { dns });
    expect(res.valid).toBe(false);
  });

  it("rejects domains without MX/A records", async () => {
    const dns: EmailRealityDnsResolver = {
      resolveMx: async () => [],
      resolveA: async () => [],
    };
    const res = await validateEmailReality("user@nonexistent.invalid", { dns });
    expect(res.valid).toBe(false);
  });

  it("allows domains with MX records", async () => {
    const dns: EmailRealityDnsResolver = {
      resolveMx: async () => [{ exchange: "mx.example.com", priority: 10 }],
      resolveA: async () => [],
    };
    const res = await validateEmailReality("user@example.com", { dns });
    expect(res.valid).toBe(true);
  });

  it("allows dns_unknown outcomes to avoid false negatives on transient dns issues", async () => {
    const dns: EmailRealityDnsResolver = {
      resolveMx: async () => {
        throw new Error("timeout");
      },
      resolveA: async () => {
        throw new Error("servfail");
      },
    };
    const res = await validateEmailReality("user@example.com", { dns });
    expect(res.valid).toBe(true);
  });
});
