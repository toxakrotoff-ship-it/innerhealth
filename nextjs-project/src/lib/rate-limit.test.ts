import { describe, it, expect, vi } from "vitest";
import { checkRateLimit, getClientIdentifier, type RateLimitResult } from "./rate-limit";

describe("rate-limit", () => {
  describe("checkRateLimit", () => {
    it("composes key by prefix and identifier (independent counters)", async () => {
      const max = 2;
      const window = 60_000;
      expect((await checkRateLimit("id1", "p1", max, window)).success).toBe(true);
      expect((await checkRateLimit("id1", "p1", max, window)).success).toBe(true);
      expect((await checkRateLimit("id1", "p1", max, window)).success).toBe(false);

      expect((await checkRateLimit("id2", "p1", max, window)).success).toBe(true);
      expect((await checkRateLimit("id1", "p2", max, window)).success).toBe(true);
    });

    it("resets window after window ms", async () => {
      vi.useFakeTimers();
      const max = 2;
      const windowMs = 1000;
      expect((await checkRateLimit("reset-id", "reset-p", max, windowMs)).success).toBe(true);
      expect((await checkRateLimit("reset-id", "reset-p", max, windowMs)).success).toBe(true);
      expect((await checkRateLimit("reset-id", "reset-p", max, windowMs)).success).toBe(false);
      vi.advanceTimersByTime(windowMs + 100);
      expect((await checkRateLimit("reset-id", "reset-p", max, windowMs)).success).toBe(true);
      vi.useRealTimers();
    });

    it("returns valid result when remote store unavailable (fallback)", async () => {
      const orig = process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      const result: RateLimitResult = await checkRateLimit("fallback-id", "fallback-p", 5, 60_000);
      expect(result).toMatchObject({
        success: expect.any(Boolean),
        remaining: expect.any(Number),
        resetIn: expect.any(Number),
      });
      if (orig !== undefined) process.env.UPSTASH_REDIS_REST_URL = orig;
    });
  });

  describe("getClientIdentifier", () => {
    it("returns x-forwarded-for first IP or x-real-ip or unknown", () => {
      expect(
        getClientIdentifier(
          new Request("http://x", {
            headers: { "x-forwarded-for": " 1.2.3.4 , 5.6.7.8 " },
          })
        )
      ).toBe("1.2.3.4");
      expect(
        getClientIdentifier(new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } }))
      ).toBe("9.9.9.9");
      expect(getClientIdentifier(new Request("http://x"))).toBe("unknown");
    });
  });
});
