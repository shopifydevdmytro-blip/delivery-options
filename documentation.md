# Delivery Logic Documentation

## Purpose

This document describes how delivery availability is decided across the storefront and checkout.

The solution has three customer-facing parts:

1. A delivery checker on product and collection pages.
2. Delivery option filtering at checkout.
3. A checkout warning banner for restricted postcodes.

The final source of truth is checkout. The storefront checker is a helpful guide before checkout, but the final delivery options are confirmed when the customer enters their delivery address.

## How the customer journey works

1. Each product is assigned a delivery group.
2. On product and collection pages, the customer can enter a UK postcode and see the expected delivery options for that product.
3. At checkout, the basket contents and the delivery address are reviewed together.
4. Only valid delivery methods remain available.
5. If the postcode is in a restricted delivery area, checkout shows a warning and no delivery method is available.

## Delivery areas

### 1. Local LE area

Any postcode starting with `LE` is treated as the local delivery area.

This area can show local services such as:

- Free Ground Floor Delivery
- Unpack and packaging disposal
- Floor delivery services
- Installation or fitting services
- Old appliance disposal
- Gas certificate services where relevant
- Full service options where relevant

### 2. Rest of UK

Any valid UK postcode that is not in the local LE area and not in the restricted postcode list is treated as Rest of UK.

This area usually shows standard nationwide delivery services, unless the product or basket has a special rule.

### 3. Restricted postcode areas

Some postcode ranges are marked as non-serviceable. In these areas:

- The storefront checker shows that delivery is unavailable.
- Checkout removes all delivery methods.
- Checkout also shows a warning message: `Delivery unavailable - We do not deliver to this region`.

### 4. Non-UK addresses

The delivery rules are designed for the United Kingdom only.

If the customer enters a non-UK delivery country at checkout, no delivery method is made available.

## Required product setup

Each product must be assigned a delivery group using the Shopify field `custom.delivery_group`.

Products can also optionally use a separate Shopify field called `custom.high_margin_free_delivery`.

This is a separate product flag. It is not a delivery group.

Supported delivery group values are:

- `freestanding_laundry`
- `integrated_laundry`
- `cooker_hood`
- `electric_installation`
- `gas_installation`
- `range_cookers`
- `american_fridge_freezers`
- `freestanding_refrigeration`
- `integrated_refrigeration`
- `small_appliances`
- `free_delivery_eligible`

If a product is missing this value or contains an unknown value, it is treated as `unconfigured`.

The system also accepts these equivalent labels:

- `dual_fuel_range`, `dual_fuel_range_cookers`, and `range_cooker` are treated as `range_cookers`
- `american_fridge_freezer` is treated as `american_fridge_freezers`

## High margin free delivery flag

When `custom.high_margin_free_delivery` is enabled for a product:

- Restricted postcode rules still apply
- Non-UK address rules still apply
- In the local LE area, the product keeps its normal local delivery and service options
- Outside the local LE area, the product is intended to show Free Delivery

This flag works alongside the base delivery group rather than replacing it.

In practical terms:

- The delivery group still controls the local LE service menu
- The high margin free delivery flag changes the Rest of UK outcome to Free Delivery

## Standard Rest of UK delivery set

When a product or basket follows the standard nationwide rule, the customer sees:

- `1/2 Man Delivery Team (2 - 10 Working Days)` - GBP 29.99
- `Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)` - GBP 39.99

## Delivery group rules

### freestanding_laundry

Local LE area:

- Free Ground Floor Delivery - GBP 0.00
- Unpack & Dispose Packaging - GBP 9.99
- 1st Floor Delivery (No Lift) - GBP 29.99
- 2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch
- Install Your Appliance - GBP 24.99
- Disposal Of Old Appliance - GBP 14.99
- Full Service - GBP 34.99

Rest of UK:

- Standard Rest of UK delivery set

### integrated_laundry

Local LE area:

- Free Ground Floor Delivery - GBP 0.00
- Unpack & Dispose Packaging - GBP 9.99
- 1st Floor Delivery (No Lift) - GBP 29.99
- 2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch
- Install Your Appliance - GBP 69.99
- Disposal Of Old Appliance - GBP 14.99
- Full Service - GBP 79.99

Rest of UK:

- Standard Rest of UK delivery set

### cooker_hood

Local LE area:

- Free Ground Floor Delivery - GBP 0.00
- Unpack & Dispose Packaging - GBP 9.99
- 1st Floor Delivery (No Lift) - GBP 29.99
- 2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch
- Install Your Appliance - GBP 69.99
- Disposal Of Old Appliance - GBP 14.99
- Full Service - GBP 79.99

Rest of UK:

- Standard Rest of UK delivery set

### electric_installation

Local LE area:

- Free Ground Floor Delivery - GBP 0.00
- Unpack & Dispose Packaging - GBP 9.99
- 1st Floor Delivery (No Lift) - GBP 29.99
- 2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch
- Install Your Appliance - GBP 39.99
- Disposal Of Old Appliance - GBP 14.99
- Full Service - GBP 49.99

Rest of UK:

- Standard Rest of UK delivery set

### gas_installation

Local LE area:

- Free Ground Floor Delivery - GBP 0.00
- Unpack & Dispose Packaging - GBP 9.99
- 1st Floor Delivery (No Lift) - GBP 29.99
- 2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch
- Install Your Appliance - GBP 69.99
- Disposal Of Old Appliance - GBP 14.99
- Gas Safe Certificate - GBP 24.99
- Full Service - GBP 99.99

Rest of UK:

- Standard Rest of UK delivery set

### range_cookers

Local LE area:

- Free Ground Floor Delivery - GBP 0.00
- Unpack & Dispose Packaging - GBP 9.99
- 1st Floor Delivery (No Lift) - GBP 29.99
- 2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch
- Install Your Appliance - GBP 79.99
- Disposal Of Old Appliance - GBP 14.99
- Gas Safe Certificate - GBP 24.99
- Full Service - GBP 119.99

Rest of UK:

- Standard Rest of UK delivery set

### american_fridge_freezers

Local LE area:

- Free Ground Floor Delivery - GBP 0.00
- Unpack & Dispose Packaging - GBP 9.99
- Doors Off To Fit In Property - GBP 49.99
- 1st Floor Delivery (No Lift) - Our Sales Team Will Get In Touch
- 2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch
- Disposal Of Old Appliance - GBP 49.99

Rest of UK:

- Pallet Delivery only - GBP 39.99

### freestanding_refrigeration

Local LE area:

- Free Ground Floor Delivery - GBP 0.00
- Unpack & Dispose Packaging - GBP 9.99
- 1st Floor Delivery (No Lift) - GBP 29.99
- 2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch
- Disposal Of Old Appliance - GBP 29.99

Rest of UK:

- Standard Rest of UK delivery set

### integrated_refrigeration

Local LE area:

- Free Ground Floor Delivery - GBP 0.00
- Unpack & Dispose Packaging - GBP 9.99
- 1st Floor Delivery (No Lift) - GBP 29.99
- 2nd Floor Or More Delivery (No Lift) - Our Sales Team Will Get In Touch
- Fitting Of New Appliance - GBP 69.99
- Disposal Of Old Appliance - GBP 29.99
- Full Service - GBP 99.99

Rest of UK:

- Standard Rest of UK delivery set

### small_appliances

Local LE area:

- Free Delivery - GBP 0.00

Rest of UK:

- If the applicable basket subtotal is above GBP 50.00: Free Delivery
- If the applicable basket subtotal is GBP 50.00 or below: Next Day Parcel Delivery - GBP 4.99

### free_delivery_eligible

Local LE area:

- Free Delivery - GBP 0.00

Rest of UK:

- If checkout only contains this delivery group: Free Delivery
- If this is mixed with any other delivery group: Standard Rest of UK delivery set

### unconfigured

Local LE area:

- Free Ground Floor Delivery - GBP 0.00

Rest of UK:

- Standard Rest of UK delivery set

## Basket rules

### Repeated products in the same delivery group

If a basket contains several items from the same delivery group, the delivery logic is unchanged. The system looks at the unique delivery groups in the basket, not the number of items.

### Mixed baskets in the local LE area

If the basket contains more than one delivery group in the local LE area, the checkout simplifies to:

- Free Ground Floor Delivery only

This applies even if the basket includes products that would normally have installation, disposal, or other local services when bought on their own.

If all products in the basket section being shipped together are marked with `custom.high_margin_free_delivery`, checkout keeps the combined local LE service options instead of simplifying to base delivery only.

### Mixed baskets in Rest of UK

The following combined rules apply outside the local LE area:

- `free_delivery_eligible` on its own: Free Delivery
- `free_delivery_eligible` mixed with any other group: Standard Rest of UK delivery set
- `small_appliances` on its own: Free Delivery above GBP 50.00, otherwise Next Day Parcel Delivery
- `small_appliances` mixed with a standard appliance group: Standard Rest of UK delivery set
- `small_appliances` mixed with `american_fridge_freezers`: Pallet Delivery only
- `american_fridge_freezers` on its own: Pallet Delivery only
- `american_fridge_freezers` mixed with a standard appliance group: Pallet Delivery only
- `american_fridge_freezers` mixed with `free_delivery_eligible`: Standard Rest of UK delivery set
- Products marked with `custom.high_margin_free_delivery` on their own: Free Delivery
- If all products being shipped together are marked with `custom.high_margin_free_delivery`: Free Delivery
- If high margin free delivery products are mixed with regular products: normal mixed basket rules continue to apply
- Any basket made up only of standard appliance groups or unconfigured products: Standard Rest of UK delivery set

## Storefront delivery checker

The storefront delivery checker can be placed on:

- Product pages
- Collection pages

It allows the customer to enter a UK postcode and see the expected delivery outcome before checkout.

On product pages:

- The checker shows the expected delivery options for the selected product

On collection pages:

- The checker can update the visible product cards with delivery information for each product

Important customer-facing notes:

- The checker is a guide, not the final decision point
- The checker is intended for UK postcodes only
- Final basket rules are confirmed at checkout
- Mixed basket rules are only fully enforced at checkout
- Basket value rules are also confirmed at checkout
- The last entered postcode is remembered in the customer browser for convenience

## Checkout warning banner

At checkout, customers in restricted postcode areas see this message:

- `Delivery unavailable`
- `We do not deliver to this region`

This banner is informational. The actual delivery restriction is enforced by removing all delivery methods for that address.

## Restricted postcode coverage

The restricted postcode list currently covers these postcode ranges:

- AB10-16, AB21-25, AB30-39, AB41-45, AB51-56
- BT1-49, BT51-57, BT60-71, BT74-82, BT92-94
- CF47
- CR9
- DD1-11
- DG5-9
- FK8-9, FK11-12, FK14-21
- G63, G83-84
- HS1-9
- IM1-9, IM86-87, IM99
- IV1-28, IV30-32, IV36, IV40-49, IV51-56, IV63
- KA26-28
- KW1-3, KW5-17
- KY6-10, KY13-16
- PA20-38, PA41-49, PA60-78, PA80
- PH1-26, PH30-44, PH49-50
- PO30-41
- TR21-25

## Important operational notes

- The system does not create new shipping methods. It only decides which existing shipping methods should remain available.
- Shipping methods and prices must already exist in Shopify and must match the intended delivery menu.
- Checkout is the final source of truth.
- The storefront checker helps the customer before checkout, but it does not override checkout rules.
- The solution is designed for UK delivery rules.
