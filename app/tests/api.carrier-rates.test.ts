import test from "node:test";
import assert from "node:assert/strict";
import { handleCarrierRatesRequest } from "../carrier-rates.server.ts";

test("returns HTTP 200 and a Shopify carrier rates payload", async () => {
  const request = new Request("https://example.com/api/carrier-rates", {
    body: JSON.stringify({
      rate: {
        currency: "GBP",
        destination: {
          country: "GB",
          postal_code: "NG1 1AA",
        },
        items: [
          {
            price: 67999,
            product_id: 1,
            quantity: 1,
            requires_shipping: true,
            variant_id: 11,
          },
        ],
        order_totals: {
          subtotal_price: 67999,
        },
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const response = await handleCarrierRatesRequest(request, {
    fetchProductMetadata: async () => ({
      byProductId: new Map(),
      byVariantId: new Map([
        ["11", { deliveryGroup: "freestanding_laundry" }],
      ]),
    }),
    getOfflineSession: async () => ({
      accessToken: "token",
      shop: "example.myshopify.com",
    }),
    log() {},
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");

  const payload = await response.json();
  assert.ok(Array.isArray(payload.rates));
  assert.equal(payload.rates[0]?.service_name, "1/2 Man Delivery Team (2 - 10 Working Days)");
});

test("returns empty rates when delivery is unavailable", async () => {
  const request = new Request("https://example.com/api/carrier-rates", {
    body: JSON.stringify({
      rate: {
        currency: "GBP",
        destination: {
          country: "GB",
          postal_code: "IV1 2AB",
        },
        items: [
          {
            price: 67999,
            product_id: 1,
            quantity: 1,
            requires_shipping: true,
            variant_id: 11,
          },
        ],
        order_totals: {
          subtotal_price: 67999,
        },
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const response = await handleCarrierRatesRequest(request, {
    fetchProductMetadata: async () => ({
      byProductId: new Map(),
      byVariantId: new Map([
        ["11", { deliveryGroup: "freestanding_laundry" }],
      ]),
    }),
    getOfflineSession: async () => ({
      accessToken: "token",
      shop: "example.myshopify.com",
    }),
    log() {},
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { rates: [] });
});
