import { describe, it, expect } from "vitest";
import {
  stripControlAndInvisibleChars,
  sanitizeHumanName,
  sanitizePhone,
} from "./input-sanitizers";

describe("input-sanitizers", () => {
  describe("stripControlAndInvisibleChars", () => {
    it("removes control characters", () => {
      const withControl = "Hello\u0000World\u001F";
      expect(stripControlAndInvisibleChars(withControl)).toBe("HelloWorld");
    });
  });

  describe("sanitizeHumanName", () => {
    it("collapses repeated spaces to one", () => {
      expect(sanitizeHumanName("John    Doe")).toBe("John Doe");
    });

    it("strips control chars and collapses spaces", () => {
      expect(sanitizeHumanName("  Jane \u0000  Smith  ")).toBe("Jane Smith");
    });
  });

  describe("sanitizePhone", () => {
    it("keeps only allowed characters: +, digits, space, -, (, )", () => {
      expect(sanitizePhone("+7 (999) 123-45-67")).toBe("+7 (999) 123-45-67");
      expect(sanitizePhone("+7(999)123-45-67")).toBe("+7(999)123-45-67");
    });

    it("removes disallowed characters", () => {
      expect(sanitizePhone("+7 abc (999) xyz")).toBe("+7 (999) ");
    });
  });
});
