import type { ActionFunctionArgs } from "react-router";
import { handleCarrierRatesRequest } from "../carrier-rates.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Shopify calls this callback during checkout to request live shipping rates
  // for the current destination and cart contents.
  //
  // Expected request payload:
  // {
  //   rate: {
  //     destination: { country, postal_code, ... },
  //     items: [{ variant_id, product_id, price, quantity, ... }],
  //     currency,
  //     order_totals
  //   }
  // }
  //
  // Required response format:
  // {
  //   rates: [
  //     {
  //       service_name,
  //       service_code,
  //       total_price,
  //       currency,
  //       description
  //     }
  //   ]
  // }
  return handleCarrierRatesRequest(request);
};
