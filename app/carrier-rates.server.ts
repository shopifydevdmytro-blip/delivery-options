import db from "./db.server.ts";
import {
  buildExpectedService,
  buildFreeDeliveryExpectedService,
  buildMultiGroupLocalService,
  buildRestOfUkServices,
  getDeliveryGroupRule,
  isHighMarginFreeDeliveryValue,
  normalizeDeliveryGroupKey,
  type DeliveryGroupKey,
  type ExpectedService,
  type RestOfUkRuleKind,
} from "../extensions/shipping-customisation/src/delivery-rules.ts";
import { classifyDeliveryLocation } from "../extensions/shared/delivery/postcodes.ts";

const ADMIN_API_VERSION = "2026-01";
const SHOPIFY_NODE_LIMIT = 250;
const TEST_STORE_PREFIX = "test-store-";

type ProductMetafieldValue = string | null | undefined;

export interface CarrierServiceAddress {
  country?: string | null;
  postal_code?: string | null;
}

export interface CarrierServiceLineItem {
  quantity?: number | null;
  price?: number | null;
  product_id?: number | null;
  variant_id?: number | null;
  requires_shipping?: boolean | null;
}

export interface CarrierServiceRequestPayload {
  rate?: {
    currency?: string | null;
    destination?: CarrierServiceAddress | null;
    items?: CarrierServiceLineItem[] | null;
    order_totals?: {
      subtotal_price?: number | null;
    } | null;
  } | null;
}

export interface CarrierServiceRate {
  service_name: string;
  service_code: string;
  total_price: string;
  currency: string;
  description: string;
}

interface CarrierRateResponse {
  rates: CarrierServiceRate[];
}

interface CarrierRateLineMetadata {
  deliveryGroup?: ProductMetafieldValue;
  highMarginFreeDelivery?: ProductMetafieldValue;
}

interface CarrierProductMetadataLookup {
  byProductId: Map<string, CarrierRateLineMetadata>;
  byVariantId: Map<string, CarrierRateLineMetadata>;
}

interface OfflineSessionRecord {
  shop: string;
  accessToken: string;
}

interface DeliveryProfile {
  deliveryGroups: DeliveryGroupKey[];
  allHighMarginFreeDelivery: boolean;
}

export interface CarrierRatesDependencies {
  fetchProductMetadata: (
    session: OfflineSessionRecord,
    items: CarrierServiceLineItem[],
  ) => Promise<CarrierProductMetadataLookup>;
  getOfflineSession: (request: Request) => Promise<OfflineSessionRecord>;
  log: (message: string, payload: string) => void;
}

const DEFAULT_CARRIER_RATES_DEPENDENCIES: CarrierRatesDependencies = {
  fetchProductMetadata: fetchProductMetadataForCarrierItems,
  getOfflineSession: getOfflineSessionForCarrierRequest,
  log: console.log,
};

export async function handleCarrierRatesRequest(
  request: Request,
  dependencies: CarrierRatesDependencies = DEFAULT_CARRIER_RATES_DEPENDENCIES,
): Promise<Response> {
  // Shopify calls this callback during checkout whenever it needs live
  // shipping rates for the current cart and destination.
  const payload = (await request.json()) as CarrierServiceRequestPayload;

  dependencies.log(
    "Received Shopify CarrierService request:",
    JSON.stringify(payload, null, 2),
  );

  const items = payload.rate?.items ?? [];
  const session = await dependencies.getOfflineSession(request);
  const productMetadata = await dependencies.fetchProductMetadata(session, items);
  const response = buildCarrierRateResponse(payload, productMetadata);

  dependencies.log(
    "Returning Shopify CarrierService rates:",
    JSON.stringify(response, null, 2),
  );

  // Shopify expects a successful 20x response with a top-level `rates` array.
  // Returning an empty array means this carrier service can't serve the request.
  return Response.json(response, {
    status: 200,
  });
}

export function buildCarrierRateResponse(
  payload: CarrierServiceRequestPayload,
  productMetadata: CarrierProductMetadataLookup,
): CarrierRateResponse {
  const rate = payload.rate;

  if (!rate) {
    return { rates: [] };
  }

  const deliveryZone = classifyDeliveryLocation({
    postcode: rate.destination?.postal_code,
    countryCode: rate.destination?.country,
  });

  if (
    deliveryZone === "excluded" ||
    deliveryZone === "unsupported_country" ||
    deliveryZone === "unknown"
  ) {
    return { rates: [] };
  }

  const items = rate.items ?? [];
  const deliveryProfile = getDeliveryProfile(items, productMetadata);
  const subtotalAmount = getCarrierSubtotalAmount(rate);
  const expectedServices =
    deliveryZone === "le_local"
      ? buildLeExpectedServices(deliveryProfile)
      : buildRestOfUkExpectedServices(deliveryProfile, subtotalAmount);

  return {
    rates: expectedServices.map((service) =>
      buildCarrierServiceRate(service, rate.currency ?? "GBP"),
    ),
  };
}

async function getOfflineSessionForCarrierRequest(
  request: Request,
): Promise<OfflineSessionRecord> {
  const explicitShop = normalizeShopDomain(process.env.SHOPIFY_TARGET_SHOP);
  const headerShop = normalizeShopDomain(
    request.headers.get("x-shopify-shop-domain") ??
      request.headers.get("X-Shopify-Shop-Domain"),
  );

  if (explicitShop) {
    const explicitSession = await db.session.findUnique({
      where: { id: `offline_${explicitShop}` },
      select: { shop: true, accessToken: true },
    });

    if (explicitSession) {
      return explicitSession;
    }
  }

  if (headerShop) {
    const headerSession = await db.session.findFirst({
      where: {
        isOnline: false,
        shop: headerShop,
      },
      select: { shop: true, accessToken: true },
    });

    if (headerSession) {
      return headerSession;
    }
  }

  const preferredSession = await db.session.findFirst({
    where: {
      isOnline: false,
      NOT: {
        shop: {
          startsWith: TEST_STORE_PREFIX,
        },
      },
    },
    orderBy: {
      shop: "asc",
    },
    select: { shop: true, accessToken: true },
  });

  if (preferredSession) {
    return preferredSession;
  }

  const fallbackSession = await db.session.findFirst({
    where: {
      isOnline: false,
    },
    orderBy: {
      shop: "asc",
    },
    select: { shop: true, accessToken: true },
  });

  if (!fallbackSession) {
    throw new Error("No offline Shopify session is available for carrier rates");
  }

  return fallbackSession;
}

async function fetchProductMetadataForCarrierItems(
  session: OfflineSessionRecord,
  items: CarrierServiceLineItem[],
): Promise<CarrierProductMetadataLookup> {
  const nodeIds = collectCarrierNodeIds(items);
  const lookup: CarrierProductMetadataLookup = {
    byProductId: new Map(),
    byVariantId: new Map(),
  };

  if (nodeIds.length === 0) {
    return lookup;
  }

  for (let index = 0; index < nodeIds.length; index += SHOPIFY_NODE_LIMIT) {
    const ids = nodeIds.slice(index, index + SHOPIFY_NODE_LIMIT);
    const response = await fetchShopifyAdminGraphql<CarrierNodesQueryResponse>({
      accessToken: session.accessToken,
      query: CARRIER_PRODUCT_METADATA_QUERY,
      shop: session.shop,
      variables: { ids },
    });

    for (const node of response.data.nodes) {
      if (!node) {
        continue;
      }

      if (node.__typename === "ProductVariant") {
        const variantId = parseGidNumericId(node.id);
        const productId = parseGidNumericId(node.product.id);
        const metadata = {
          deliveryGroup: node.product.metafield?.value,
          highMarginFreeDelivery:
            node.product.highMarginFreeDeliveryMetafield?.value,
        };

        if (variantId) {
          lookup.byVariantId.set(variantId, metadata);
        }

        if (productId) {
          lookup.byProductId.set(productId, metadata);
        }

        continue;
      }

      if (node.__typename === "Product") {
        const productId = parseGidNumericId(node.id);

        if (productId) {
          lookup.byProductId.set(productId, {
            deliveryGroup: node.metafield?.value,
            highMarginFreeDelivery:
              node.highMarginFreeDeliveryMetafield?.value,
          });
        }
      }
    }
  }

  return lookup;
}

async function fetchShopifyAdminGraphql<T>({
  accessToken,
  query,
  shop,
  variables,
}: {
  accessToken: string;
  query: string;
  shop: string;
  variables: Record<string, unknown>;
}): Promise<T> {
  const response = await fetch(
    `https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Shopify Admin API request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as CarrierNodesQueryResponse & {
    errors?: unknown;
  };

  if (payload.errors) {
    throw new Error(
      `Shopify Admin API returned errors: ${JSON.stringify(payload.errors)}`,
    );
  }

  return payload as T;
}

function collectCarrierNodeIds(items: CarrierServiceLineItem[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const variantId = toNumericId(item.variant_id);

    if (variantId) {
      const gid = `gid://shopify/ProductVariant/${variantId}`;

      if (!seen.has(gid)) {
        seen.add(gid);
        ids.push(gid);
      }

      continue;
    }

    const productId = toNumericId(item.product_id);

    if (productId) {
      const gid = `gid://shopify/Product/${productId}`;

      if (!seen.has(gid)) {
        seen.add(gid);
        ids.push(gid);
      }
    }
  }

  return ids;
}

function getDeliveryProfile(
  items: CarrierServiceLineItem[],
  productMetadata: CarrierProductMetadataLookup,
): DeliveryProfile {
  const deliveryGroups: DeliveryGroupKey[] = [];
  let hasShippableItem = false;
  let allHighMarginFreeDelivery = true;

  for (const item of items) {
    if (item.requires_shipping === false) {
      continue;
    }

    hasShippableItem = true;

    const metadata = getItemMetadata(item, productMetadata);
    const deliveryGroup = normalizeDeliveryGroupKey(metadata.deliveryGroup);

    if (!deliveryGroups.includes(deliveryGroup)) {
      deliveryGroups.push(deliveryGroup);
    }

    if (!isHighMarginFreeDeliveryValue(metadata.highMarginFreeDelivery)) {
      allHighMarginFreeDelivery = false;
    }
  }

  if (deliveryGroups.length === 0) {
    deliveryGroups.push("unconfigured");
    allHighMarginFreeDelivery = false;
  }

  return {
    deliveryGroups,
    allHighMarginFreeDelivery: hasShippableItem && allHighMarginFreeDelivery,
  };
}

function getItemMetadata(
  item: CarrierServiceLineItem,
  productMetadata: CarrierProductMetadataLookup,
): CarrierRateLineMetadata {
  const variantId = toNumericId(item.variant_id);

  if (variantId) {
    const variantMetadata = productMetadata.byVariantId.get(variantId);

    if (variantMetadata) {
      return variantMetadata;
    }
  }

  const productId = toNumericId(item.product_id);

  if (productId) {
    const productMetadataValue = productMetadata.byProductId.get(productId);

    if (productMetadataValue) {
      return productMetadataValue;
    }
  }

  return {};
}

function getCarrierSubtotalAmount(
  rate: NonNullable<CarrierServiceRequestPayload["rate"]>,
): number {
  const subtotalPrice = rate.order_totals?.subtotal_price;

  if (typeof subtotalPrice === "number") {
    return subtotalPrice / 100;
  }

  let subtotalAmount = 0;

  for (const item of rate.items ?? []) {
    const price = typeof item.price === "number" ? item.price : 0;
    const quantity = typeof item.quantity === "number" ? item.quantity : 0;
    subtotalAmount += price * quantity;
  }

  return subtotalAmount / 100;
}

function buildLeExpectedServices(
  deliveryProfile: DeliveryProfile,
): ExpectedService[] {
  if (deliveryProfile.deliveryGroups.length > 1) {
    if (deliveryProfile.allHighMarginFreeDelivery) {
      return buildMergedLeExpectedServices(deliveryProfile.deliveryGroups);
    }

    return [buildMultiGroupLocalService()];
  }

  const selectedDeliveryGroup = deliveryProfile.deliveryGroups[0] ?? "unconfigured";
  const localServices = getDeliveryGroupRule(selectedDeliveryGroup).localServices;

  return localServices.map((service) => buildExpectedService(service));
}

function buildRestOfUkExpectedServices(
  deliveryProfile: DeliveryProfile,
  subtotalAmount: number,
): ExpectedService[] {
  if (deliveryProfile.allHighMarginFreeDelivery) {
    return [buildFreeDeliveryExpectedService()];
  }

  const restOfUkRuleKinds: RestOfUkRuleKind[] = [];

  for (const deliveryGroup of deliveryProfile.deliveryGroups) {
    restOfUkRuleKinds.push(getDeliveryGroupRule(deliveryGroup).restOfUkRule);
  }

  return buildRestOfUkServices({
    restOfUkRuleKinds:
      restOfUkRuleKinds.length > 0
        ? restOfUkRuleKinds
        : [getDeliveryGroupRule("unconfigured").restOfUkRule],
    subtotalAmount,
  });
}

function buildMergedLeExpectedServices(
  deliveryGroups: DeliveryGroupKey[],
): ExpectedService[] {
  const expectedServices: ExpectedService[] = [];
  const seen = new Set<string>();

  for (const deliveryGroup of deliveryGroups) {
    const localServices = getDeliveryGroupRule(deliveryGroup).localServices;

    for (const localService of localServices) {
      const expectedService = buildExpectedService(localService);
      const dedupeKey = `${expectedService.normalizedTitle}::${formatPriceKey(
        expectedService.price,
      )}`;

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      expectedServices.push(expectedService);
    }
  }

  return expectedServices;
}

function buildCarrierServiceRate(
  expectedService: ExpectedService,
  currency: string,
): CarrierServiceRate {
  return {
    service_name: expectedService.title,
    service_code: `${expectedService.key}_${toMinorUnits(expectedService.price)}`,
    total_price: String(toMinorUnits(expectedService.price)),
    currency,
    description: expectedService.description,
  };
}

function toMinorUnits(value?: number): number {
  return typeof value === "number" ? Math.round(value * 100) : 0;
}

function formatPriceKey(value?: number): string {
  return typeof value === "number" ? value.toFixed(2) : "";
}

function normalizeShopDomain(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function toNumericId(value?: number | null): string | null {
  return typeof value === "number" ? String(value) : null;
}

function parseGidNumericId(gid: string): string | null {
  const parts = gid.split("/");
  return parts[parts.length - 1] || null;
}

type CarrierNodesQueryResponse = {
  data: {
    nodes: Array<
      | {
          __typename: "Product";
          id: string;
          metafield?: {
            value?: string | null;
          } | null;
          highMarginFreeDeliveryMetafield?: {
            value?: string | null;
          } | null;
        }
      | {
          __typename: "ProductVariant";
          id: string;
          product: {
            id: string;
            metafield?: {
              value?: string | null;
            } | null;
            highMarginFreeDeliveryMetafield?: {
              value?: string | null;
            } | null;
          };
        }
      | null
    >;
  };
};

const CARRIER_PRODUCT_METADATA_QUERY = `#graphql
  query CarrierRateProductMetadata($ids: [ID!]!) {
    nodes(ids: $ids) {
      __typename
      ... on Product {
        id
        metafield(namespace: "custom", key: "delivery_group") {
          value
        }
        highMarginFreeDeliveryMetafield: metafield(
          namespace: "custom"
          key: "high_margin_free_delivery"
        ) {
          value
        }
      }
      ... on ProductVariant {
        id
        product {
          id
          metafield(namespace: "custom", key: "delivery_group") {
            value
          }
          highMarginFreeDeliveryMetafield: metafield(
            namespace: "custom"
            key: "high_margin_free_delivery"
          ) {
            value
          }
        }
      }
    }
  }
`;
