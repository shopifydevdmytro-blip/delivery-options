import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, test } from "vitest";

function loadChecker() {
  const assetUrl = new URL(
    "../../product-delivery-price/assets/delivery-checker.js",
    import.meta.url,
  );
  const context = {
    URL,
    decodeURIComponent,
    document: {
      addEventListener() {},
      readyState: "loading",
    },
    Intl,
    window: {
      location: {
        origin: "https://www.powerappliances.co.uk",
      },
      localStorage: {
        getItem() {
          return "";
        },
        setItem() {},
      },
    },
  };

  vm.runInNewContext(readFileSync(assetUrl, "utf8"), context, {
    filename: "delivery-checker.js",
  });

  return context.window.ProductDeliveryChecker;
}

describe("product delivery checker storefront rules", () => {
  const checker = loadChecker();

  test("returns LE local services for every delivery group", () => {
    const expectations = [
      ["freestanding_laundry", 7, "Install Your Appliance"],
      ["integrated_laundry", 7, "Install Your Appliance"],
      ["cooker_hood", 7, "Install Your Appliance"],
      ["electric_installation", 7, "Install Your Appliance"],
      ["gas_installation", 8, "Gas Safe Certificate"],
      ["range_cookers", 8, "Gas Safe Certificate"],
      ["american_fridge_freezers", 6, "Doors Off To Fit In Property"],
      ["freestanding_refrigeration", 5, "Disposal Of Old Appliance"],
      ["integrated_refrigeration", 7, "Fitting Of New Appliance"],
      ["small_appliances", 1, "Free Delivery"],
      ["free_delivery_eligible", 1, "Free Delivery"],
      ["unconfigured", 1, "Free Ground Floor Delivery"],
    ];

    expectations.forEach(([group, serviceCount, title]) => {
      const result = checker.calculateDeliveryResult({
        group,
        postcode: "LE1 2AB",
        price: 100,
      });

      expect(result.services).toHaveLength(serviceCount);
      expect(result.services.map((service) => service.title).join(" | ")).toContain(title);
    });
  });

  test("returns standard Rest of UK appliance services", () => {
    const result = checker.calculateDeliveryResult({
      group: "freestanding_laundry",
      postcode: "NG1 1AA",
      price: 399,
    });

    expect(result.services).toEqual([
      {
        label: "",
        price: 29.99,
        title: "1/2 Man Delivery Team (2 - 10 Working Days)",
      },
      {
        label: "",
        price: 39.99,
        title: "Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)",
      },
    ]);
  });

  test("uses product price for Rest of UK small appliance delivery", () => {
    expect(
      checker.calculateDeliveryResult({
        group: "small_appliances",
        postcode: "NG1 1AA",
        price: 49.99,
      }).services[0],
    ).toMatchObject({
      price: 4.99,
      title: "Next Day Parcel Delivery",
    });

    expect(
      checker.calculateDeliveryResult({
        group: "small_appliances",
        postcode: "NG1 1AA",
        price: 50.01,
      }).services[0],
    ).toMatchObject({
      price: 0,
      title: "Free Delivery",
    });
  });

  test("shows Free Delivery for free delivery eligible products", () => {
    expect(
      checker.calculateDeliveryResult({
        group: "free_delivery_eligible",
        postcode: "NG1 1AA",
        price: 10,
      }).services[0],
    ).toMatchObject({
      price: 0,
      title: "Free Delivery",
    });
  });

  test("keeps American fridge freezers pallet-only outside LE", () => {
    const result = checker.calculateDeliveryResult({
      group: "american_fridge_freezers",
      postcode: "NG1 1AA",
      price: 999,
    });

    expect(result.services).toEqual([
      {
        label: "",
        price: 39.99,
        title: "Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)",
      },
    ]);
  });

  test("matches checkout for excluded postcodes by showing no delivery services", () => {
    const result = checker.calculateDeliveryResult({
      group: "free_delivery_eligible",
      postcode: "IV1 2AB",
      price: 399,
    });

    expect(result.notice).toBe("Delivery is not available for this postcode.");
    expect(result.services).toEqual([]);
  });

  test("falls back unknown delivery groups to unconfigured rules", () => {
    expect(
      checker.calculateDeliveryResult({
        group: "unknown_group",
        postcode: "LE1 2AB",
        price: 100,
      }).services[0],
    ).toMatchObject({
      price: 0,
      title: "Free Ground Floor Delivery",
    });

    expect(
      checker.calculateDeliveryResult({
        group: "unknown_group",
        postcode: "NG1 1AA",
        price: 100,
      }).services.map((service) => service.title),
    ).toEqual([
      "1/2 Man Delivery Team (2 - 10 Working Days)",
      "Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)",
    ]);
  });

  test("normalizes storefront aliases and collection product URLs", () => {
    expect(checker.normalizeDeliveryGroup("dual_fuel_range")).toBe("range_cookers");
    expect(checker.normalizeDeliveryGroup("american-fridge-freezer")).toBe(
      "american_fridge_freezers",
    );
    expect(
      checker.handleFromUrl("/collections/laundry/products/washing-machine?variant=1"),
    ).toBe("washing-machine");
  });
});
