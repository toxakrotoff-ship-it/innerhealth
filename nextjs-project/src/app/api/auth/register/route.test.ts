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

vi.mock("@/lib/security/public-email-domain", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/public-email-domain")>("@/lib/security/public-email-domain");
  return {
    ...actual,
    validatePublicEmailDomain: vi.fn(async (email: string) => {
      if (email.includes("@nonexistent.invalid")) {
        return {
          valid: false,
          reason: "domain_not_resolvable",
          userMessage: "Домен email не существует",
          shouldHideReason: false,
        };
      }
      return actual.validatePublicEmailDomain(email);
    }),
  };
});

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

  it("returns 400 for non-resolvable domain", async () => {
    const res = await POST(
      new Request("http://x/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@nonexistent.invalid",
          password: "password1234",
        }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Домен email не существует");
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

  it("returns 409 with EMAIL_ALREADY_REGISTERED when email exists", async () => {
    vi.mocked(userService.findUserByEmail).mockResolvedValue({
      id: "existing",
      email: "taken@gmail.com",
    } as Awaited<ReturnType<typeof userService.findUserByEmail>>);

    const res = await POST(
      new Request("http://x/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "taken@gmail.com",
          password: "password1234",
        }),
      })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("EMAIL_ALREADY_REGISTERED");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(10);
    expect(body.error).toMatch(/сети магазинов|войдите|кабинет/i);
    expect(userService.createUser).not.toHaveBeenCalled();
  });
});
