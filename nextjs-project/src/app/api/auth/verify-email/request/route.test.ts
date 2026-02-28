import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("server-only", () => ({}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 5, resetIn: 60 })),
  getClientIdentifier: vi.fn(() => "test-client"),
}));

vi.mock("@/services/user.service", () => ({
  findUserByEmailForEmailVerification: vi.fn(),
  findUserByIdForEmailVerification: vi.fn(),
}));

const userService = await import("@/services/user.service");

describe("POST /api/auth/verify-email/request", () => {
  beforeEach(() => {
    vi.mocked(userService.findUserByEmailForEmailVerification).mockResolvedValue(null);
    vi.mocked(userService.findUserByIdForEmailVerification).mockResolvedValue(null);
  });

  it("returns neutral { ok: true } for unknown or missing email", async () => {
    const res = await POST(
      new Request("http://x/api/auth/verify-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("returns neutral { ok: true } for disposable domain (no leakage)", async () => {
    const res = await POST(
      new Request("http://x/api/auth/verify-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@tempmail.com" }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
