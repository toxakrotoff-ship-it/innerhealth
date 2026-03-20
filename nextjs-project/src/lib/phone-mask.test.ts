import { describe, it, expect } from "vitest";
import { validatePhoneRu } from "./phone-mask";

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

    it("rejects non-mobile RU numbers that don't match the 9xx mask", () => {
      const res = validatePhoneRu("+7 (499) 123-45-67");
      expect(res.valid).toBe(false);
      if (res.valid === false) expect(res.message).toMatch(/9/);
    });
  });
});

