import { describe, expect, test } from "vitest";
import { normalizeDeliveryGroupKey } from "../src/delivery-rules";

describe("delivery group rules", () => {
  test("normalizes storefront delivery group aliases", () => {
    expect(normalizeDeliveryGroupKey("dual_fuel_range")).toBe("range_cookers");
    expect(normalizeDeliveryGroupKey("american_fridge_freezer")).toBe(
      "american_fridge_freezers",
    );
  });

  test("normalizes spacing and hyphen separators", () => {
    expect(normalizeDeliveryGroupKey("Dual Fuel Range")).toBe("range_cookers");
    expect(normalizeDeliveryGroupKey("american-fridge-freezer")).toBe(
      "american_fridge_freezers",
    );
    expect(normalizeDeliveryGroupKey("Free Delivery Eligible")).toBe(
      "free_delivery_eligible",
    );
    expect(normalizeDeliveryGroupKey("free-delivery-eligible")).toBe(
      "free_delivery_eligible",
    );
  });

  test("normalizes free delivery eligible metafield value", () => {
    expect(normalizeDeliveryGroupKey("free_delivery_eligible")).toBe(
      "free_delivery_eligible",
    );
  });
});
