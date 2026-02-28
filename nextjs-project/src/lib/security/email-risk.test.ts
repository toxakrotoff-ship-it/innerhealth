import { describe, it, expect } from "vitest";
import {
  normalizeEmailAddress,
  extractEmailDomain,
  getEmailRiskVerdict,
} from "./email-risk";

describe("email-risk", () => {
  describe("getEmailRiskVerdict", () => {
    it("returns block for disposable domain", () => {
      expect(getEmailRiskVerdict("user@tempmail.com")).toBe("block");
    });

    it("returns allow for normal domain", () => {
      expect(getEmailRiskVerdict("user@gmail.com")).toBe("allow");
    });

    it("normalizes uppercase and mixed-case email before verdict", () => {
      expect(getEmailRiskVerdict("User@TEMPSPAM.COM")).toBe("block");
      expect(getEmailRiskVerdict("User@Gmail.COM")).toBe("allow");
    });
  });

  describe("normalizeEmailAddress", () => {
    it("lowercases local and domain parts", () => {
      expect(normalizeEmailAddress("User@Example.COM")).toBe("user@example.com");
    });
  });

  describe("extractEmailDomain", () => {
    it("returns domain part of email", () => {
      expect(extractEmailDomain("user@gmail.com")).toBe("gmail.com");
      expect(extractEmailDomain("a@b.co")).toBe("b.co");
    });
  });
});
