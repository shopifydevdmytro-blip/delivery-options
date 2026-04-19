import {
  buildExpectedService,
  buildMultiGroupLocalService,
  buildRestOfUkServices,
  getDeliveryGroupRule,
  normalizeDeliveryGroupKey,
  type DeliveryGroupKey,
  type ExpectedService,
  type RestOfUkRuleKind,
} from "./delivery-rules";
import {
  classifyDeliveryLocation,
  type DeliveryLocationInput,
} from "../../shared/delivery/postcodes";

type Money = {
  amount: string;
  currencyCode: string;
};

type DeliveryOption = {
  handle: string;
  title?: string | null;
  description?: string | null;
  cost: Money;
};

type MailingAddress = {
  countryCode?: string | null;
  zip?: string | null;
};

type ProductMetafield = {
  value?: string | null;
} | null;

type Product = {
  id: string;
  title: string;
  handle: string;
  metafield?: ProductMetafield;
};

type ProductVariantMerchandise = {
  __typename: "ProductVariant";
  id: string;
  product: Product;
};

type CartLineCost = {
  subtotalAmount?: Money | null;
} | null;

type CartLine = {
  quantity: number;
  cost?: CartLineCost;
  merchandise:
    | ProductVariantMerchandise
    | {
        __typename: string;
      };
};

type CartDeliveryGroup = {
  cartLines?: CartLine[] | null;
  deliveryAddress?: MailingAddress | null;
  deliveryOptions: DeliveryOption[];
};

type RunInput = {
  cart: {
    cost: {
      subtotalAmount: Money;
    };
    lines: CartLine[];
    deliveryGroups: CartDeliveryGroup[];
  };
};

type DeliveryOptionHideOperation = {
  deliveryOptionHide: {
    deliveryOptionHandle: string;
  };
};

type DeliveryOptionMoveOperation = {
  deliveryOptionMove: {
    deliveryOptionHandle: string;
    index: number;
  };
};

type Operation =
  | DeliveryOptionHideOperation
  | DeliveryOptionMoveOperation;

type RunResult = {
  operations: Operation[];
};

type MatchedService = {
  expectedService: ExpectedService;
  preparedOption: PreparedDeliveryOption;
};

type PreparedDeliveryOption = {
  option: DeliveryOption;
  normalizedTitle: string;
  amount: number;
  used: boolean;
};

const NO_CHANGES: RunResult = {
  operations: [],
};

export default function cartDeliveryOptionsTransformRun(
  input: RunInput,
): RunResult {
  const operations: Operation[] = [];

  for (const deliveryGroup of input.cart.deliveryGroups) {
    addDeliveryGroupOperations({
      deliveryGroup,
      fallbackCartLines: input.cart.lines,
      fallbackSubtotalAmount: Number(input.cart.cost.subtotalAmount.amount),
      operations,
    });
  }

  return operations.length > 0 ? { operations } : NO_CHANGES;
}

function addDeliveryGroupOperations({
  deliveryGroup,
  fallbackCartLines,
  fallbackSubtotalAmount,
  operations,
}: {
  deliveryGroup: CartDeliveryGroup;
  fallbackCartLines: CartLine[];
  fallbackSubtotalAmount: number;
  operations: Operation[];
}): void {
  const deliveryOptions = deliveryGroup.deliveryOptions;

  if (deliveryOptions.length === 0) {
    return;
  }

  const deliveryZone = classifyDeliveryLocation({
    postcode: deliveryGroup.deliveryAddress?.zip,
    countryCode: deliveryGroup.deliveryAddress?.countryCode,
  });

  if (
    deliveryZone === "excluded" ||
    deliveryZone === "unsupported_country" ||
    deliveryZone === "unknown"
  ) {
    addHideAllDeliveryOptionsOperations(deliveryOptions, operations);
    return;
  }

  const deliveryGroupCartLines = getDeliveryGroupCartLines(
    deliveryGroup,
    fallbackCartLines,
  );
  const cartDeliveryGroups = getCartDeliveryGroups(deliveryGroupCartLines);
  const expectedServices =
    deliveryZone === "le_local"
      ? buildLeExpectedServices(cartDeliveryGroups)
      : buildRestOfUkExpectedServices(
          cartDeliveryGroups,
          getCartLinesSubtotalAmount(deliveryGroupCartLines) ??
            fallbackSubtotalAmount,
        );

  if (expectedServices.length === 0) {
    return;
  }

  const matchedServices = matchExpectedServices(expectedServices, deliveryOptions);

  if (matchedServices.length === 0) {
    addHideAllDeliveryOptionsOperations(deliveryOptions, operations);
    return;
  }

  for (const option of deliveryOptions) {
    if (isMatchedDeliveryOption(matchedServices, option.handle)) {
      continue;
    }

    operations.push({
      deliveryOptionHide: {
        deliveryOptionHandle: option.handle,
      },
    });
  }

  for (let index = 0; index < matchedServices.length; index += 1) {
    const matchedService = matchedServices[index];

    operations.push({
      deliveryOptionMove: {
        deliveryOptionHandle: matchedService.preparedOption.option.handle,
        index,
      },
    });
  }
}

function addHideAllDeliveryOptionsOperations(
  deliveryOptions: DeliveryOption[],
  operations: Operation[],
): void {
  for (const option of deliveryOptions) {
    operations.push({
      deliveryOptionHide: {
        deliveryOptionHandle: option.handle,
      },
    });
  }
}

function buildLeExpectedServices(
  cartDeliveryGroups: DeliveryGroupKey[],
): ExpectedService[] {
  if (cartDeliveryGroups.length > 1) {
    return [buildMultiGroupLocalService()];
  }

  const selectedDeliveryGroup = cartDeliveryGroups[0] ?? "unconfigured";
  const localServices = getDeliveryGroupRule(selectedDeliveryGroup).localServices;
  const expectedServices: ExpectedService[] = [];

  for (const localService of localServices) {
    expectedServices.push(buildExpectedService(localService));
  }

  return expectedServices;
}

function buildRestOfUkExpectedServices(
  cartDeliveryGroups: DeliveryGroupKey[],
  subtotalAmount: number,
): ExpectedService[] {
  const restOfUkRuleKinds: RestOfUkRuleKind[] = [];

  for (const deliveryGroup of cartDeliveryGroups) {
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

function matchExpectedServices(
  expectedServices: ExpectedService[],
  deliveryOptions: DeliveryOption[],
): MatchedService[] {
  const preparedOptions = prepareDeliveryOptions(deliveryOptions);
  const matchedServices: MatchedService[] = [];

  for (const expectedService of expectedServices) {
    let matchedOption: PreparedDeliveryOption | null = null;

    for (const preparedOption of preparedOptions) {
      if (preparedOption.used) {
        continue;
      }

      if (deliveryOptionMatchesExpectedService(preparedOption, expectedService)) {
        matchedOption = preparedOption;
        break;
      }
    }

    if (!matchedOption) {
      continue;
    }

    matchedOption.used = true;
    matchedServices.push({
      expectedService,
      preparedOption: matchedOption,
    });
  }

  return matchedServices;
}

function prepareDeliveryOptions(
  deliveryOptions: DeliveryOption[],
): PreparedDeliveryOption[] {
  const preparedOptions: PreparedDeliveryOption[] = [];

  for (const option of deliveryOptions) {
    preparedOptions.push({
      option,
      normalizedTitle: normalizeText(option.title),
      amount: Number(option.cost.amount),
      used: false,
    });
  }

  return preparedOptions;
}

function deliveryOptionMatchesExpectedService(
  preparedOption: PreparedDeliveryOption,
  expectedService: ExpectedService,
): boolean {
  if (
    typeof expectedService.price === "number" &&
    !pricesMatch(preparedOption.amount, expectedService.price)
  ) {
    return false;
  }

  return preparedOption.normalizedTitle === expectedService.normalizedTitle;
}

function isMatchedDeliveryOption(
  matchedServices: MatchedService[],
  deliveryOptionHandle: string,
): boolean {
  for (const matchedService of matchedServices) {
    if (matchedService.preparedOption.option.handle === deliveryOptionHandle) {
      return true;
    }
  }

  return false;
}

function getCartDeliveryGroups(lines: CartLine[]): DeliveryGroupKey[] {
  const deliveryGroups: DeliveryGroupKey[] = [];

  for (const line of lines) {
    if (!isProductVariantMerchandise(line.merchandise)) {
      continue;
    }

    const deliveryGroup = normalizeDeliveryGroupKey(
      line.merchandise.product.metafield?.value,
    );

    if (!hasCartDeliveryGroup(deliveryGroups, deliveryGroup)) {
      deliveryGroups.push(deliveryGroup);
    }
  }

  if (deliveryGroups.length === 0) {
    deliveryGroups.push("unconfigured");
  }

  return deliveryGroups;
}

function getDeliveryGroupCartLines(
  deliveryGroup: CartDeliveryGroup,
  fallbackCartLines: CartLine[],
): CartLine[] {
  if (deliveryGroup.cartLines && deliveryGroup.cartLines.length > 0) {
    return deliveryGroup.cartLines;
  }

  return fallbackCartLines;
}

function getCartLinesSubtotalAmount(lines: CartLine[]): number | null {
  let subtotalAmount = 0;
  let hasLineSubtotal = false;

  for (const line of lines) {
    const amount = line.cost?.subtotalAmount?.amount;

    if (amount === undefined || amount === null) {
      continue;
    }

    subtotalAmount += Number(amount);
    hasLineSubtotal = true;
  }

  return hasLineSubtotal ? subtotalAmount : null;
}

function hasCartDeliveryGroup(
  deliveryGroups: DeliveryGroupKey[],
  deliveryGroup: DeliveryGroupKey,
): boolean {
  for (const selectedDeliveryGroup of deliveryGroups) {
    if (selectedDeliveryGroup === deliveryGroup) {
      return true;
    }
  }

  return false;
}

function pricesMatch(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.01;
}

function normalizeText(value?: string | null): string {
  const text = value ?? "";
  let normalized = "";
  let previousWasSpace = true;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    if (code >= 48 && code <= 57) {
      normalized += text[index];
      previousWasSpace = false;
      continue;
    }

    if (code >= 65 && code <= 90) {
      normalized += text[index];
      previousWasSpace = false;
      continue;
    }

    if (code >= 97 && code <= 122) {
      normalized += String.fromCharCode(code - 32);
      previousWasSpace = false;
      continue;
    }

    if (!previousWasSpace) {
      normalized += " ";
      previousWasSpace = true;
    }
  }

  if (previousWasSpace && normalized.length > 0) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function isProductVariantMerchandise(
  merchandise: CartLine["merchandise"],
): merchandise is ProductVariantMerchandise {
  return merchandise.__typename === "ProductVariant";
}
