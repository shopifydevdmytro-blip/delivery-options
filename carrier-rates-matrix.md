# Carrier Rates Matrix

This document describes the current CarrierService delivery logic used by `/api/carrier-rates`.

## Delivery Zones

| Zone | Rule |
| --- | --- |
| `LE local` | Any postcode starting with `LE` |
| `Rest of UK` | UK postcode that is not `LE` and not in the excluded list |
| `Excluded` | Postcodes from the restricted postcode list |
| `Unsupported country` | Any non-UK country |
| `Unknown` | Missing or empty postcode |

## Product Group Matrix

| `custom.delivery_group` | `LE local` rates | `Rest of UK` rates |
| --- | --- | --- |
| `freestanding_laundry` | `Free Ground Floor Delivery` `£0`, `Unpack & Dispose Packaging` `£9.99`, `1st Floor Delivery (No Lift)` `£29.99`, `2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `Install Your Appliance...` `£24.99`, `Disposal Of Old Appliance...` `£14.99`, `Full Service...` `£34.99` | `1/2 Man Delivery Team (2 - 10 Working Days)` `£29.99`, `Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)` `£39.99` |
| `integrated_laundry` | `Free Ground Floor Delivery` `£0`, `Unpack & Dispose Packaging` `£9.99`, `1st Floor Delivery (No Lift)` `£29.99`, `2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `Install Your Appliance...` `£69.99`, `Disposal Of Old Appliance...` `£14.99`, `Full Service...` `£79.99` | `1/2 Man Delivery Team...` `£29.99`, `Pallet Delivery...` `£39.99` |
| `cooker_hood` | `Free Ground Floor Delivery` `£0`, `Unpack & Dispose Packaging` `£9.99`, `1st Floor Delivery (No Lift)` `£29.99`, `2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `Install Your Appliance...` `£69.99`, `Disposal Of Old Appliance...` `£14.99`, `Full Service...` `£79.99` | `1/2 Man Delivery Team...` `£29.99`, `Pallet Delivery...` `£39.99` |
| `electric_installation` | `Free Ground Floor Delivery` `£0`, `Unpack & Dispose Packaging` `£9.99`, `1st Floor Delivery (No Lift)` `£29.99`, `2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `Install Your Appliance...` `£39.99`, `Disposal Of Old Appliance...` `£14.99`, `Full Service...` `£49.99` | `1/2 Man Delivery Team...` `£29.99`, `Pallet Delivery...` `£39.99` |
| `gas_installation` | `Free Ground Floor Delivery` `£0`, `Unpack & Dispose Packaging` `£9.99`, `1st Floor Delivery (No Lift)` `£29.99`, `2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `Install Your Appliance...` `£69.99`, `Disposal Of Old Appliance...` `£14.99`, `Gas Safe Certificate` `£24.99`, `Full Service...` `£99.99` | `1/2 Man Delivery Team...` `£29.99`, `Pallet Delivery...` `£39.99` |
| `range_cookers` | `Free Ground Floor Delivery` `£0`, `Unpack & Dispose Packaging` `£9.99`, `1st Floor Delivery (No Lift)` `£29.99`, `2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `Install Your Appliance...` `£79.99`, `Disposal Of Old Appliance...` `£14.99`, `Gas Safe Certificate` `£24.99`, `Full Service...` `£119.99` | `1/2 Man Delivery Team...` `£29.99`, `Pallet Delivery...` `£39.99` |
| `american_fridge_freezers` | `Free Ground Floor Delivery` `£0`, `Unpack & Dispose Packaging` `£9.99`, `Doors Off To Fit In Property` `£49.99`, `1st Floor Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `Disposal Of Old Appliance...` `£49.99` | `Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)` `£39.99` |
| `freestanding_refrigeration` | `Free Ground Floor Delivery` `£0`, `Unpack & Dispose Packaging` `£9.99`, `1st Floor Delivery (No Lift)` `£29.99`, `2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `Disposal Of Old Appliance...` `£29.99` | `1/2 Man Delivery Team...` `£29.99`, `Pallet Delivery...` `£39.99` |
| `integrated_refrigeration` | `Free Ground Floor Delivery` `£0`, `Unpack & Dispose Packaging` `£9.99`, `1st Floor Delivery (No Lift)` `£29.99`, `2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch` `£0`, `Fitting Of New Appliance` `£69.99`, `Disposal Of Old Appliance...` `£29.99`, `Full Service...` `£99.99` | `1/2 Man Delivery Team...` `£29.99`, `Pallet Delivery...` `£39.99` |
| `small_appliances` | `Free Delivery` `£0` | If subtotal `> £50`: `Free Delivery` `£0`. If subtotal `<= £50`: `Next Day Parcel Delivery` `£4.99` |
| `free_delivery_eligible` | `Free Delivery` `£0` | `Free Delivery` `£0` only when it is the only delivery group in the shipment. Mixed-cart rules apply otherwise. |
| empty / unknown / `unconfigured` | `Free Ground Floor Delivery` `£0` | `1/2 Man Delivery Team...` `£29.99`, `Pallet Delivery...` `£39.99` |

## `custom.high_margin_free_delivery`

| Flag value | `LE local` | `Rest of UK` |
| --- | --- | --- |
| truthy (`true`, `1`, `yes`, `on`, `high_margin_free_delivery`) | Normal `LE` rules still apply for the product group | If all shippable items in the shipment are high-margin, return only `Free Delivery` `£0` |
| empty / false / missing | No special override | No special override |

## Mixed Cart Rules

### `LE local`

| Basket composition | Result |
| --- | --- |
| Single delivery group | Use that group's full `LE` rate set |
| Multiple delivery groups, not all items high-margin | Only `Free Ground Floor Delivery` `£0` |
| Multiple delivery groups, all items high-margin | Merge all local rate options from all groups and remove duplicates |

### `Rest of UK`

| Basket composition | Result |
| --- | --- |
| Only `small_appliances` | `Free Delivery` if subtotal `> £50`, otherwise `Next Day Parcel Delivery` |
| `free_delivery_eligible` on its own | `Free Delivery` |
| `free_delivery_eligible` mixed with any other group | Standard pair: `1/2 Man Delivery Team` + `Pallet Delivery` |
| `american_fridge_freezers` on its own | Only `Pallet Delivery` |
| `american_fridge_freezers` mixed with anything else | Only `Pallet Delivery` |
| All items high-margin | Only `Free Delivery` |
| Standard large-appliance groups mixed together | Standard pair: `1/2 Man Delivery Team` + `Pallet Delivery` |

## Delivery Unavailable Rules

| Condition | CarrierService response |
| --- | --- |
| Excluded postcode | `{ "rates": [] }` |
| Non-UK country | `{ "rates": [] }` |
| Missing postcode | `{ "rates": [] }` |

## Price Calculation

| Rule | Behavior |
| --- | --- |
| Fixed-price services | Prices are hardcoded in the delivery rules and returned directly by the server |
| Small appliance threshold | Uses `rate.order_totals.subtotal_price` from Shopify if present; otherwise falls back to `sum(item.price * quantity)` |
| CarrierService format | Prices are converted to minor units as strings, for example `£29.99 -> "2999"` and `£0 -> "0"` |

## Notes

- The checkout logic no longer depends on matching pre-existing Shopify shipping rates by name and price.
- The theme extension still uses its current local JS logic and may temporarily diverge from checkout if rules change only on the server.
