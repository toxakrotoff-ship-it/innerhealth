import { describe, it, expect } from "vitest";
import { applyPhoneMask, validatePhoneRu } from "./phone-mask";

describe("phone-mask", () => {
  describe("validatePhoneRu", () => {
    it("accepts a mobile RU number that matches +7 (999) ...", () => {
      const res = validatePhoneRu("+7 (999) 123-45-67");
      expect(res.valid).toBe(true);
    });

    it("accepts a mobile RU number entered with leading 8", () => {
      const res = validatePhoneRu("8 (999) 123-45-67");
      expect(res.valid).toBe(true);
    });

    it("accepts a saved 10-digit mobile number without the country code", () => {
      const res = validatePhoneRu("9104398540");
      expect(res.valid).toBe(true);
    });

    it("accepts an autofilled mobile number in +7XXXXXXXXXX format", () => {
      const res = validatePhoneRu("+79104398540");
      expect(res.valid).toBe(true);
    });

    it("rejects non-mobile RU numbers that don't match the 9xx mask", () => {
      const res = validatePhoneRu("+7 (499) 123-45-67");
      expect(res.valid).toBe(false);
      if (res.valid === false) expect(res.message).toMatch(/9/);
    });
  });

  describe("applyPhoneMask", () => {
    it("formats a saved 10-digit mobile number as +7 (XXX) XXX-XX-XX", () => {
      expect(applyPhoneMask("9104398540")).toBe("+7 (910) 439-85-40");
    });

    it("formats an autofilled +7XXXXXXXXXX number as +7 (XXX) XXX-XX-XX", () => {
      expect(applyPhoneMask("+79104398540")).toBe("+7 (910) 439-85-40");
    });
  });
});
