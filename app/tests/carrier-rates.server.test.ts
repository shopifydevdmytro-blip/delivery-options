import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCarrierRateResponse,
  type CarrierServiceRequestPayload,
  fetchProductMetadataForCarrierItems,
} from "../carrier-rates.server.ts";
import db from "../db.server.ts";

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

function createJsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
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

test("refreshes an expired offline session before fetching product metadata", async () => {
  const originalFetch = global.fetch;
  const sessionModel = db.session as typeof db.session & {
    update: typeof db.session.update;
  };
  const originalUpdate = sessionModel.update;
  const originalApiKey = process.env.SHOPIFY_API_KEY;
  const originalApiSecret = process.env.SHOPIFY_API_SECRET;

  process.env.SHOPIFY_API_KEY = "test-api-key";
  process.env.SHOPIFY_API_SECRET = "test-api-secret";

  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

  global.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    fetchCalls.push({ url, init });

    if (url.endsWith("/admin/oauth/access_token")) {
      return createJsonResponse({
        access_token: "fresh-token",
        expires_in: 3600,
        refresh_token: "fresh-refresh-token",
        refresh_token_expires_in: 7776000,
      });
    }

    return createJsonResponse({
      data: {
        nodes: [
          {
            __typename: "Product",
            id: "gid://shopify/Product/1",
            metafield: { value: "freestanding_laundry" },
            highMarginFreeDeliveryMetafield: { value: "true" },
          },
        ],
      },
    });
  }) as typeof global.fetch;

  sessionModel.update = (async () => ({
    id: "offline_example.myshopify.com",
    shop: "example.myshopify.com",
    accessToken: "fresh-token",
    expires: new Date(Date.now() + 3600_000),
    refreshToken: "fresh-refresh-token",
    refreshTokenExpires: new Date(Date.now() + 7_776_000_000),
  })) as unknown as typeof db.session.update;

  try {
    const lookup = await fetchProductMetadataForCarrierItems(
      {
        id: "offline_example.myshopify.com",
        shop: "example.myshopify.com",
        accessToken: "expired-token",
        expires: new Date(Date.now() - 60_000),
        refreshToken: "refresh-token",
        refreshTokenExpires: new Date(Date.now() + 3_600_000),
      },
      [{ product_id: 1 }],
    );

    assert.equal(fetchCalls.length, 2);
    assert.match(fetchCalls[0]!.url, /\/admin\/oauth\/access_token$/);
    assert.match(fetchCalls[1]!.url, /\/graphql\.json$/);
    assert.equal(
      fetchCalls[1]!.init?.headers
        ? (fetchCalls[1]!.init!.headers as Record<string, string>)[
            "X-Shopify-Access-Token"
          ]
        : undefined,
      "fresh-token",
    );
    assert.equal(
      lookup.byProductId.get("1")?.deliveryGroup,
      "freestanding_laundry",
    );
  } finally {
    global.fetch = originalFetch;
    sessionModel.update = originalUpdate;
    process.env.SHOPIFY_API_KEY = originalApiKey;
    process.env.SHOPIFY_API_SECRET = originalApiSecret;
  }
});

test("retries the Shopify Admin API request once after a 401 by refreshing the offline session", async () => {
  const originalFetch = global.fetch;
  const sessionModel = db.session as typeof db.session & {
    update: typeof db.session.update;
  };
  const originalUpdate = sessionModel.update;
  const originalApiKey = process.env.SHOPIFY_API_KEY;
  const originalApiSecret = process.env.SHOPIFY_API_SECRET;

  process.env.SHOPIFY_API_KEY = "test-api-key";
  process.env.SHOPIFY_API_SECRET = "test-api-secret";

  let graphqlCallCount = 0;

  global.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.endsWith("/graphql.json")) {
      graphqlCallCount += 1;

      if (graphqlCallCount === 1) {
        return createJsonResponse(
          { errors: ["unauthorized"] },
          { status: 401 },
        );
      }

      return createJsonResponse({
        data: {
          nodes: [
            {
              __typename: "Product",
              id: "gid://shopify/Product/1",
              metafield: { value: "small_appliances" },
              highMarginFreeDeliveryMetafield: { value: null },
            },
          ],
        },
      });
    }

    return createJsonResponse({
      access_token: "fresh-token",
      expires_in: 3600,
      refresh_token: "fresh-refresh-token",
      refresh_token_expires_in: 7776000,
    });
  }) as typeof global.fetch;

  let updateCallCount = 0;
  sessionModel.update = (async () => {
    updateCallCount += 1;

    return {
      id: "offline_example.myshopify.com",
      shop: "example.myshopify.com",
      accessToken: "fresh-token",
      expires: new Date(Date.now() + 3600_000),
      refreshToken: "fresh-refresh-token",
      refreshTokenExpires: new Date(Date.now() + 7_776_000_000),
    };
  }) as unknown as typeof db.session.update;

  try {
    const lookup = await fetchProductMetadataForCarrierItems(
      {
        id: "offline_example.myshopify.com",
        shop: "example.myshopify.com",
        accessToken: "stale-token",
        expires: new Date(Date.now() + 3600_000),
        refreshToken: "refresh-token",
        refreshTokenExpires: new Date(Date.now() + 3_600_000),
      },
      [{ product_id: 1 }],
    );

    assert.equal(graphqlCallCount, 2);
    assert.equal(updateCallCount, 1);
    assert.equal(lookup.byProductId.get("1")?.deliveryGroup, "small_appliances");
  } finally {
    global.fetch = originalFetch;
    sessionModel.update = originalUpdate;
    process.env.SHOPIFY_API_KEY = originalApiKey;
    process.env.SHOPIFY_API_SECRET = originalApiSecret;
  }
});
