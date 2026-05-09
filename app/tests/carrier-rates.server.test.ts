import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCarrierRateResponse,
  type CarrierServiceRequestPayload,
} from "../carrier-rates.server.ts";

function createLookup({
  product = {},
  variant = {},
}: {
  product?: Record<
    string,
    { deliveryGroup?: string | null; highMarginFreeDelivery?: string | null }
  >;
  variant?: Record<
    string,
    { deliveryGroup?: string | null; highMarginFreeDelivery?: string | null }
  >;
}) {
  return {
    byProductId: new Map(Object.entries(product)),
    byVariantId: new Map(Object.entries(variant)),
  };
}

function createPayload({
  country = "GB",
  currency = "GBP",
  items,
  postcode,
  subtotalPrice,
}: {
  country?: string;
  currency?: string;
  items: Array<{
    price: number;
    productId: number;
    quantity?: number;
    requiresShipping?: boolean;
    variantId: number;
  }>;
  postcode?: string | null;
  subtotalPrice?: number;
}): CarrierServiceRequestPayload {
  return {
    rate: {
      currency,
      destination: {
        country,
        postal_code: postcode,
      },
      items: items.map((item) => ({
        price: item.price,
        product_id: item.productId,
        quantity: item.quantity ?? 1,
        requires_shipping: item.requiresShipping ?? true,
        variant_id: item.variantId,
      })),
      order_totals: {
        subtotal_price:
          typeof subtotalPrice === "number"
            ? subtotalPrice
            : items.reduce(
                (sum, item) => sum + item.price * (item.quantity ?? 1),
                0,
              ),
      },
    },
  };
}

test("returns LE local services for a single freestanding laundry product", () => {
  const response = buildCarrierRateResponse(
    createPayload({
      items: [{ price: 67999, productId: 1, variantId: 11 }],
      postcode: "LE1 2AB",
    }),
    createLookup({
      variant: {
        "11": { deliveryGroup: "freestanding_laundry" },
      },
    }),
  );

  assert.equal(response.rates.length, 7);
  assert.equal(response.rates[0]?.service_name, "Free Ground Floor Delivery");
  assert.equal(
    response.rates.some(
      (rate) =>
        rate.service_name ===
        "Install Your Appliance (Must be a like for like appliance & existing pipework all ready)",
    ),
    true,
  );
});

test("returns a single base LE service for mixed delivery groups", () => {
  const response = buildCarrierRateResponse(
    createPayload({
      items: [
        { price: 67999, productId: 1, variantId: 11 },
        { price: 39999, productId: 2, variantId: 22 },
      ],
      postcode: "LE1 2AB",
    }),
    createLookup({
      variant: {
        "11": { deliveryGroup: "freestanding_laundry" },
        "22": { deliveryGroup: "gas_installation" },
      },
    }),
  );

  assert.deepEqual(response.rates, [
    {
      currency: "GBP",
      description: "Ground floor only",
      service_code: "free_ground_floor_delivery_0",
      service_name: "Free Ground Floor Delivery",
      total_price: "0",
    },
  ]);
});

test("returns standard rest of UK appliance services", () => {
  const response = buildCarrierRateResponse(
    createPayload({
      items: [{ price: 67999, productId: 1, variantId: 11 }],
      postcode: "NG1 1AA",
    }),
    createLookup({
      variant: {
        "11": { deliveryGroup: "freestanding_laundry" },
      },
    }),
  );

  assert.deepEqual(
    response.rates.map((rate) => rate.service_name),
    [
      "1/2 Man Delivery Team (2 - 10 Working Days)",
      "Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)",
    ],
  );
});

test("returns paid parcel delivery for small appliances under the threshold", () => {
  const response = buildCarrierRateResponse(
    createPayload({
      items: [{ price: 4999, productId: 1, variantId: 11 }],
      postcode: "NG1 1AA",
    }),
    createLookup({
      variant: {
        "11": { deliveryGroup: "small_appliances" },
      },
    }),
  );

  assert.deepEqual(response.rates, [
    {
      currency: "GBP",
      description: "Parcel delivery",
      service_code: "next_day_parcel_delivery_499",
      service_name: "Next Day Parcel Delivery",
      total_price: "499",
    },
  ]);
});

test("returns free delivery for small appliances over the threshold", () => {
  const response = buildCarrierRateResponse(
    createPayload({
      items: [{ price: 5001, productId: 1, variantId: 11 }],
      postcode: "NG1 1AA",
    }),
    createLookup({
      variant: {
        "11": { deliveryGroup: "small_appliances" },
      },
    }),
  );

  assert.deepEqual(response.rates, [
    {
      currency: "GBP",
      description: "Standard delivery",
      service_code: "free_delivery_0",
      service_name: "Free Delivery",
      total_price: "0",
    },
  ]);
});

test("returns free delivery for high margin products outside LE", () => {
  const response = buildCarrierRateResponse(
    createPayload({
      items: [{ price: 99999, productId: 1, variantId: 11 }],
      postcode: "NG1 1AA",
    }),
    createLookup({
      variant: {
        "11": {
          deliveryGroup: "american_fridge_freezers",
          highMarginFreeDelivery: "true",
        },
      },
    }),
  );

  assert.deepEqual(response.rates, [
    {
      currency: "GBP",
      description: "Standard delivery",
      service_code: "free_delivery_0",
      service_name: "Free Delivery",
      total_price: "0",
    },
  ]);
});

test("falls back unknown delivery groups to unconfigured rules", () => {
  const response = buildCarrierRateResponse(
    createPayload({
      items: [{ price: 99999, productId: 1, variantId: 11 }],
      postcode: "NG1 1AA",
    }),
    createLookup({
      variant: {
        "11": {
          deliveryGroup: "unknown_group",
        },
      },
    }),
  );

  assert.deepEqual(
    response.rates.map((rate) => rate.service_name),
    [
      "1/2 Man Delivery Team (2 - 10 Working Days)",
      "Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)",
    ],
  );
});

test("returns no rates for excluded postcodes", () => {
  const response = buildCarrierRateResponse(
    createPayload({
      items: [{ price: 67999, productId: 1, variantId: 11 }],
      postcode: "IV1 2AB",
    }),
    createLookup({
      variant: {
        "11": { deliveryGroup: "freestanding_laundry" },
      },
    }),
  );

  assert.deepEqual(response, { rates: [] });
});

test("returns no rates for unsupported countries", () => {
  const response = buildCarrierRateResponse(
    createPayload({
      country: "FR",
      items: [{ price: 67999, productId: 1, variantId: 11 }],
      postcode: "75001",
    }),
    createLookup({
      variant: {
        "11": { deliveryGroup: "freestanding_laundry" },
      },
    }),
  );

  assert.deepEqual(response, { rates: [] });
});
