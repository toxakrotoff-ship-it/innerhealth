import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 5, resetIn: 60 })),
  getClientIdentifier: vi.fn(() => "test-client"),
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

vi.mock("@/services/user.service", () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  getBaseUrlForEmails: vi.fn(() => "http://test"),
  sendEmailVerificationLinkEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/services/email-verification.service", () => ({
  issueEmailVerificationToken: vi.fn().mockResolvedValue({
    token: "t",
    email: "user@gmail.com",
  }),
}));

const userService = await import("@/services/user.service");

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.mocked(userService.findUserByEmail).mockResolvedValue(null);
    vi.mocked(userService.createUser).mockResolvedValue({
      id: "u1",
      email: "user@gmail.com",
      name: null,
      role: "USER",
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof userService.createUser>>);
  });

  it("returns 400 for disposable domain", async () => {
    const res = await POST(
      new Request("http://x/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@tempmail.com",
          password: "password1234",
        }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error).not.toMatch(/disposable|internal|stack|prisma|database/i);
  });

  it("does not expose sensitive internals in error text", async () => {
    const res = await POST(
      new Request("http://x/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad", password: "short" }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error).not.toMatch(/prisma|database|internal|stack/i);
  });
});
