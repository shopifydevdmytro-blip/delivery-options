export type DeliveryGroupKey =
  | "freestanding_laundry"
  | "integrated_laundry"
  | "cooker_hood"
  | "electric_installation"
  | "gas_installation"
  | "range_cookers"
  | "american_fridge_freezers"
  | "freestanding_refrigeration"
  | "integrated_refrigeration"
  | "small_appliances"
  | "free_delivery_eligible"
  | "unconfigured";

export type ServiceKey =
  | "free_ground_floor_delivery"
  | "free_delivery"
  | "unpack_and_dispose_packaging"
  | "install_appliance"
  | "fitting_of_new_appliance"
  | "disposal_old_appliance"
  | "gas_safe_certificate"
  | "full_service"
  | "doors_off"
  | "first_floor_delivery"
  | "first_floor_manual_contact"
  | "second_floor_manual_contact"
  | "two_man_delivery_team"
  | "pallet_delivery"
  | "next_day_parcel_delivery";

export type RestOfUkRuleKind =
  | "standard_appliance"
  | "small_appliance"
  | "free_delivery_eligible"
  | "american_fridge_only_pallet";

export interface ServiceDefinition {
  key: ServiceKey;
  title: string;
}

export interface ConfiguredService {
  key: ServiceKey;
  price?: number;
  title?: string;
}

export interface ExpectedService extends ConfiguredService {
  title: string;
  normalizedTitle: string;
}

export interface DeliveryGroupRule {
  localServices: ConfiguredService[];
  restOfUkRule: RestOfUkRuleKind;
}

const FLOOR_SERVICES: ConfiguredService[] = [
  { key: "first_floor_delivery", price: 29.99 },
  { key: "second_floor_manual_contact", price: 0 },
];

const BASE_LE_SERVICES: ConfiguredService[] = [
  { key: "free_ground_floor_delivery", price: 0 },
  { key: "unpack_and_dispose_packaging", price: 9.99 },
];

const DEFAULT_LE_DISPOSAL: ConfiguredService = {
  key: "disposal_old_appliance",
  price: 14.99,
};

const SERVICE_CATALOG: Record<ServiceKey, ServiceDefinition> = {
  free_ground_floor_delivery: {
    key: "free_ground_floor_delivery",
    title: "Free Ground Floor Delivery",
  },
  free_delivery: {
    key: "free_delivery",
    title: "Free Delivery",
  },
  unpack_and_dispose_packaging: {
    key: "unpack_and_dispose_packaging",
    title: "Unpack & Dispose Packaging",
  },
  install_appliance: {
    key: "install_appliance",
    title:
      "Install Your Appliance (Must be a like for like appliance & existing pipework all ready)",
  },
  fitting_of_new_appliance: {
    key: "fitting_of_new_appliance",
    title: "Fitting Of New Appliance",
  },
  disposal_old_appliance: {
    key: "disposal_old_appliance",
    title: "Disposal Of Old Appliance (Must Be Disconnected)",
  },
  gas_safe_certificate: {
    key: "gas_safe_certificate",
    title: "Gas Safe Certificate",
  },
  full_service: {
    key: "full_service",
    title:
      "Full Service (Delivery / Fitting & Disposal Of Old Appliance / Doesn't Include Disposal Of Packaging)",
  },
  doors_off: {
    key: "doors_off",
    title: "Doors Off To Fit In Property",
  },
  first_floor_delivery: {
    key: "first_floor_delivery",
    title: "1st Floor Delivery (No Lift)",
  },
  first_floor_manual_contact: {
    key: "first_floor_manual_contact",
    title:
      "1st Floor Delivery (No Lift) - Our Sales Team Will Get In Touch",
  },
  second_floor_manual_contact: {
    key: "second_floor_manual_contact",
    title:
      "2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch",
  },
  two_man_delivery_team: {
    key: "two_man_delivery_team",
    title: "1/2 Man Delivery Team (2 - 10 Working Days)",
  },
  pallet_delivery: {
    key: "pallet_delivery",
    title: "Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)",
  },
  next_day_parcel_delivery: {
    key: "next_day_parcel_delivery",
    title: "Next Day Parcel Delivery",
  },
};

const DEFAULT_REST_OF_UK_SERVICES: ConfiguredService[] = [
  { key: "two_man_delivery_team", price: 29.99 },
  { key: "pallet_delivery", price: 39.99 },
];

const SMALL_APPLIANCE_PAID_SERVICE: ConfiguredService = {
  key: "next_day_parcel_delivery",
  price: 4.99,
};

const SMALL_APPLIANCE_FREE_SERVICE: ConfiguredService = {
  key: "free_delivery",
  price: 0,
};

const PALLET_ONLY_SERVICE: ConfiguredService = {
  key: "pallet_delivery",
  price: 39.99,
};

function buildLocalInstalledServices({
  installationPrice,
  fullServicePrice,
  includeDisposal = true,
  includeGasSafeCertificate = false,
  installServiceKey = "install_appliance",
}: {
  installationPrice?: number;
  fullServicePrice?: number;
  includeDisposal?: boolean;
  includeGasSafeCertificate?: boolean;
  installServiceKey?: "install_appliance" | "fitting_of_new_appliance";
}): ConfiguredService[] {
  const services: ConfiguredService[] = [
    ...BASE_LE_SERVICES,
    ...FLOOR_SERVICES,
    { key: installServiceKey, price: installationPrice },
  ];

  if (includeDisposal) {
    services.push(DEFAULT_LE_DISPOSAL);
  }

  if (includeGasSafeCertificate) {
    services.push({ key: "gas_safe_certificate", price: 24.99 });
  }

  services.push({ key: "full_service", price: fullServicePrice });

  return services;
}

const DELIVERY_GROUP_RULES: Record<DeliveryGroupKey, DeliveryGroupRule> = {
  freestanding_laundry: {
    localServices: buildLocalInstalledServices({
      installationPrice: 24.99,
      fullServicePrice: 34.99,
    }),
    restOfUkRule: "standard_appliance",
  },
  integrated_laundry: {
    localServices: buildLocalInstalledServices({
      installationPrice: 69.99,
      fullServicePrice: 79.99,
    }),
    restOfUkRule: "standard_appliance",
  },
  cooker_hood: {
    localServices: buildLocalInstalledServices({
      installationPrice: 69.99,
      fullServicePrice: 79.99,
    }),
    restOfUkRule: "standard_appliance",
  },
  electric_installation: {
    localServices: buildLocalInstalledServices({
      installationPrice: 39.99,
      fullServicePrice: 49.99,
    }),
    restOfUkRule: "standard_appliance",
  },
  gas_installation: {
    localServices: buildLocalInstalledServices({
      installationPrice: 69.99,
      fullServicePrice: 99.99,
      includeGasSafeCertificate: true,
    }),
    restOfUkRule: "standard_appliance",
  },
  range_cookers: {
    localServices: buildLocalInstalledServices({
      installationPrice: 79.99,
      fullServicePrice: 119.99,
      includeGasSafeCertificate: true,
    }),
    restOfUkRule: "standard_appliance",
  },
  american_fridge_freezers: {
    localServices: [
      ...BASE_LE_SERVICES,
      { key: "doors_off", price: 49.99 },
      { key: "first_floor_manual_contact", price: 0 },
      { key: "second_floor_manual_contact", price: 0 },
      { key: "disposal_old_appliance", price: 49.99 },
    ],
    restOfUkRule: "american_fridge_only_pallet",
  },
  freestanding_refrigeration: {
    localServices: [
      ...BASE_LE_SERVICES,
      ...FLOOR_SERVICES,
      { key: "disposal_old_appliance", price: 29.99 },
    ],
    restOfUkRule: "standard_appliance",
  },
  integrated_refrigeration: {
    localServices: [
      ...BASE_LE_SERVICES,
      ...FLOOR_SERVICES,
      { key: "fitting_of_new_appliance", price: 69.99 },
      { key: "disposal_old_appliance", price: 29.99 },
      { key: "full_service", price: 99.99 },
    ],
    restOfUkRule: "standard_appliance",
  },
  small_appliances: {
    localServices: [{ key: "free_delivery", price: 0 }],
    restOfUkRule: "small_appliance",
  },
  free_delivery_eligible: {
    localServices: [{ key: "free_delivery", price: 0 }],
    restOfUkRule: "free_delivery_eligible",
  },
  unconfigured: {
    localServices: [{ key: "free_ground_floor_delivery", price: 0 }],
    restOfUkRule: "standard_appliance",
  },
};

export function normalizeDeliveryGroupKey(
  value?: string | null,
): DeliveryGroupKey {
  switch (normalizeDeliveryGroupText(value)) {
    case "freestanding_laundry":
      return "freestanding_laundry";
    case "integrated_laundry":
      return "integrated_laundry";
    case "cooker_hood":
      return "cooker_hood";
    case "electric_installation":
      return "electric_installation";
    case "gas_installation":
      return "gas_installation";
    case "dual_fuel_range":
    case "dual_fuel_range_cookers":
    case "range_cooker":
    case "range_cookers":
      return "range_cookers";
    case "american_fridge_freezer":
    case "american_fridge_freezers":
      return "american_fridge_freezers";
    case "freestanding_refrigeration":
      return "freestanding_refrigeration";
    case "integrated_refrigeration":
      return "integrated_refrigeration";
    case "small_appliances":
      return "small_appliances";
    case "free_delivery_eligible":
      return "free_delivery_eligible";
    default:
      return "unconfigured";
  }
}

function normalizeDeliveryGroupText(value?: string | null): string {
  const text = (value ?? "").trim().toLowerCase();
  let normalized = "";
  let previousWasSeparator = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === " " || character === "-") {
      if (!previousWasSeparator && normalized.length > 0) {
        normalized += "_";
        previousWasSeparator = true;
      }
      continue;
    }

    normalized += character;
    previousWasSeparator = false;
  }

  if (previousWasSeparator) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function getDeliveryGroupRule(
  deliveryGroup: DeliveryGroupKey,
): DeliveryGroupRule {
  return DELIVERY_GROUP_RULES[deliveryGroup] ?? DELIVERY_GROUP_RULES.unconfigured;
}

export function buildExpectedService(
  configuredService: ConfiguredService,
): ExpectedService {
  const serviceDefinition = SERVICE_CATALOG[configuredService.key];
  const title = configuredService.title ?? serviceDefinition.title;

  return {
    key: configuredService.key,
    price: configuredService.price,
    title,
    normalizedTitle: normalizeServiceText(title),
  };
}

function normalizeServiceText(value: string): string {
  let normalized = "";
  let previousWasSpace = true;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code >= 48 && code <= 57) {
      normalized += value[index];
      previousWasSpace = false;
      continue;
    }

    if (code >= 65 && code <= 90) {
      normalized += value[index];
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

export function buildMultiGroupLocalService(): ExpectedService {
  return buildExpectedService({
    key: "free_ground_floor_delivery",
    price: 0,
  });
}

export function buildRestOfUkServices({
  restOfUkRuleKinds,
  subtotalAmount,
}: {
  restOfUkRuleKinds: RestOfUkRuleKind[];
  subtotalAmount: number;
}): ExpectedService[] {
  let hasSmallAppliance = false;
  let hasFreeDeliveryEligible = false;
  let hasAmericanFridgeOnlyPallet = false;
  let hasStandardAppliance = false;

  for (const restOfUkRuleKind of restOfUkRuleKinds) {
    if (restOfUkRuleKind === "small_appliance") {
      hasSmallAppliance = true;
    } else if (restOfUkRuleKind === "free_delivery_eligible") {
      hasFreeDeliveryEligible = true;
    } else if (restOfUkRuleKind === "american_fridge_only_pallet") {
      hasAmericanFridgeOnlyPallet = true;
    } else {
      hasStandardAppliance = true;
    }
  }

  if (hasFreeDeliveryEligible) {
    if (restOfUkRuleKinds.length === 1) {
      return [buildExpectedService(SMALL_APPLIANCE_FREE_SERVICE)];
    }

    return [
      buildExpectedService(DEFAULT_REST_OF_UK_SERVICES[0]),
      buildExpectedService(DEFAULT_REST_OF_UK_SERVICES[1]),
    ];
  }

  if (hasSmallAppliance && !hasAmericanFridgeOnlyPallet && !hasStandardAppliance) {
    return [
      buildExpectedService(
        subtotalAmount > 50
          ? SMALL_APPLIANCE_FREE_SERVICE
          : SMALL_APPLIANCE_PAID_SERVICE,
      ),
    ];
  }

  if (hasAmericanFridgeOnlyPallet) {
    return [buildExpectedService(PALLET_ONLY_SERVICE)];
  }

  return [
    buildExpectedService(DEFAULT_REST_OF_UK_SERVICES[0]),
    buildExpectedService(DEFAULT_REST_OF_UK_SERVICES[1]),
  ];
}
