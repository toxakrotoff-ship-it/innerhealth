import { describe, it, expect } from "vitest";
import { validateEmail } from "./contact";

describe("contact validation", () => {
  describe("validateEmail", () => {
    it("rejects disposable/temporary domains", () => {
      const res = validateEmail("user@tempmail.com");
      expect(res.valid).toBe(false);
    });

    it("rejects emails without @", () => {
      const res = validateEmail("not-an-email.example");
      expect(res.valid).toBe(false);
    });

    it("accepts a normal email", () => {
      const res = validateEmail("user@gmail.com");
      expect(res.valid).toBe(true);
    });
  });
});

