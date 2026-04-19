const EXCLUDED_POSTCODE_PREFIX_LOOKUP =
  ",AB10,AB11,AB12,AB13,AB14,AB15,AB16,AB21,AB22,AB23,AB24,AB25,AB30,AB31,AB32,AB33,AB34,AB35,AB36,AB37,AB38,AB39,AB41,AB42,AB43,AB44,AB45,AB51,AB52,AB53,AB54,AB55,AB56,BT1,BT2,BT3,BT4,BT5,BT6,BT7,BT8,BT9,BT10,BT11,BT12,BT13,BT14,BT15,BT16,BT17,BT18,BT19,BT20,BT21,BT22,BT23,BT24,BT25,BT26,BT27,BT28,BT29,BT30,BT31,BT32,BT33,BT34,BT35,BT36,BT37,BT38,BT39,BT40,BT41,BT42,BT43,BT44,BT45,BT46,BT47,BT48,BT49,BT51,BT52,BT53,BT54,BT55,BT56,BT57,BT60,BT61,BT62,BT63,BT64,BT65,BT66,BT67,BT68,BT69,BT70,BT71,BT74,BT75,BT76,BT77,BT78,BT79,BT80,BT81,BT82,BT92,BT93,BT94,CF47,CR9,DD1,DD2,DD3,DD4,DD5,DD6,DD7,DD8,DD9,DD10,DD11,DG5,DG6,DG7,DG8,DG9,FK8,FK9,FK11,FK12,FK14,FK15,FK16,FK17,FK18,FK19,FK20,FK21,G63,G83,G84,HS1,HS2,HS3,HS4,HS5,HS6,HS7,HS8,HS9,IM1,IM2,IM3,IM4,IM5,IM6,IM7,IM8,IM9,IM86,IM87,IM99,IV1,IV2,IV3,IV4,IV5,IV6,IV7,IV8,IV9,IV10,IV11,IV12,IV13,IV14,IV15,IV16,IV17,IV18,IV19,IV20,IV21,IV22,IV23,IV24,IV25,IV26,IV27,IV28,IV30,IV31,IV32,IV36,IV40,IV41,IV42,IV43,IV44,IV45,IV46,IV47,IV48,IV49,IV51,IV52,IV53,IV54,IV55,IV56,IV63,KA26,KA27,KA28,KW1,KW2,KW3,KW5,KW6,KW7,KW8,KW9,KW10,KW11,KW12,KW13,KW14,KW15,KW16,KW17,KY6,KY7,KY8,KY9,KY10,KY13,KY14,KY15,KY16,PA20,PA21,PA22,PA23,PA24,PA25,PA26,PA27,PA28,PA29,PA30,PA31,PA32,PA33,PA34,PA35,PA36,PA37,PA38,PA41,PA42,PA43,PA44,PA45,PA46,PA47,PA48,PA49,PA60,PA61,PA62,PA63,PA64,PA65,PA66,PA67,PA68,PA69,PA70,PA71,PA72,PA73,PA74,PA75,PA76,PA77,PA78,PA80,PH1,PH2,PH3,PH4,PH5,PH6,PH7,PH8,PH9,PH10,PH11,PH12,PH13,PH14,PH15,PH16,PH17,PH18,PH19,PH20,PH21,PH22,PH23,PH24,PH25,PH26,PH30,PH31,PH32,PH33,PH34,PH35,PH36,PH37,PH38,PH39,PH40,PH41,PH42,PH43,PH44,PH49,PH50,PO30,PO31,PO32,PO33,PO34,PO35,PO36,PO37,PO38,PO39,PO40,PO41,TR21,TR22,TR23,TR24,TR25,";

export type DeliveryZone =
  | "excluded"
  | "le_local"
  | "rest_of_uk"
  | "unsupported_country"
  | "unknown";

export interface DeliveryLocationInput {
  postcode?: string | null;
  countryCode?: string | null;
}

export function normalizePostcode(postcode?: string | null): string {
  const value = postcode ?? "";
  let normalized = "";

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code === 32 || code === 9 || code === 10 || code === 13) {
      continue;
    }

    if (code >= 97 && code <= 122) {
      normalized += String.fromCharCode(code - 32);
      continue;
    }

    normalized += value[index];
  }

  return normalized;
}

export function normalizeCountryCode(countryCode?: string | null): string {
  return (countryCode ?? "").trim().toUpperCase();
}

export function isUnitedKingdomCountry(countryCode?: string | null): boolean {
  const normalized = normalizeCountryCode(countryCode);
  return normalized === "GB" || normalized === "UK";
}

export function isExcludedPostcode(postcode?: string | null): boolean {
  return isExcludedNormalizedPostcode(normalizePostcode(postcode));
}

export function isLePostcode(postcode?: string | null): boolean {
  return normalizePostcode(postcode).startsWith("LE");
}

function hasExcludedPostcodePrefix(prefix: string): boolean {
  return (
    prefix.length > 1 &&
    EXCLUDED_POSTCODE_PREFIX_LOOKUP.includes(`,${prefix},`)
  );
}

export function classifyDeliveryLocation({
  postcode,
  countryCode,
}: DeliveryLocationInput): DeliveryZone {
  const normalizedPostcode = normalizePostcode(postcode);
  const normalizedCountryCode = normalizeCountryCode(countryCode);

  if (normalizedCountryCode && !isUnitedKingdomCountry(normalizedCountryCode)) {
    return "unsupported_country";
  }

  if (!normalizedPostcode) {
    return "unknown";
  }

  if (normalizedPostcode[0] === "L" && normalizedPostcode[1] === "E") {
    return "le_local";
  }

  if (isExcludedNormalizedPostcode(normalizedPostcode)) {
    return "excluded";
  }

  return "rest_of_uk";
}

function isExcludedNormalizedPostcode(normalizedPostcode: string): boolean {
  return (
    hasExcludedPostcodePrefix(normalizedPostcode.slice(0, 2)) ||
    hasExcludedPostcodePrefix(normalizedPostcode.slice(0, 3)) ||
    hasExcludedPostcodePrefix(normalizedPostcode.slice(0, 4))
  );
}
