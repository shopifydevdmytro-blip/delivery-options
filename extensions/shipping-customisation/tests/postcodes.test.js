import { describe, expect, test } from "vitest";
import {
  classifyDeliveryLocation,
  isExcludedPostcode,
  isLePostcode,
  normalizePostcode,
} from "../../shared/delivery/postcodes";

describe("postcode utilities", () => {
  test("normalizes whitespace and casing", () => {
    expect(normalizePostcode(" le2 5zz ")).toBe("LE25ZZ");
  });

  test("detects excluded postcode prefixes", () => {
    expect(isExcludedPostcode("AB10 1AA")).toBe(true);
    expect(isExcludedPostcode("LE1 1AA")).toBe(false);
  });

  test("detects LE local postcodes", () => {
    expect(isLePostcode("LE3 7AA")).toBe(true);
    expect(isLePostcode("NG1 1AA")).toBe(false);
  });

  test("classifies excluded delivery locations", () => {
    expect(
      classifyDeliveryLocation({
        postcode: "AB10 1AA",
        countryCode: "GB",
      }),
    ).toBe("excluded");
  });

  test("classifies LE delivery locations", () => {
    expect(
      classifyDeliveryLocation({
        postcode: "LE2 5ZZ",
        countryCode: "GB",
      }),
    ).toBe("le_local");
  });

  test("classifies rest of UK delivery locations", () => {
    expect(
      classifyDeliveryLocation({
        postcode: "NG1 1AA",
        countryCode: "GB",
      }),
    ).toBe("rest_of_uk");
  });

  test("classifies unsupported countries", () => {
    expect(
      classifyDeliveryLocation({
        postcode: "75001",
        countryCode: "FR",
      }),
    ).toBe("unsupported_country");
  });

  test("classifies missing postcode as unknown", () => {
    expect(
      classifyDeliveryLocation({
        postcode: null,
        countryCode: "GB",
      }),
    ).toBe("unknown");
  });
});
