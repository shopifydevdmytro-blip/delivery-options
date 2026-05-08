# Delivery Extensions Overview
This Shopify app contains three extensions that work together to manage delivery options, postcode-based checkout messaging, and storefront delivery information.
The app does not use a custom backend for delivery logic. The delivery rules are implemented inside Shopify extensions. Some logic runs at checkout, and some logic runs directly in the storefront theme on product and collection pages.
## 1. Delivery Customization Function
Extension name: shipping-customisation
Type: Shopify Function, Delivery Customization
Where it runs: Shopify checkout, when Shopify calculates delivery options.
### Purpose
This extension controls which shipping methods are available to the customer during checkout.
It is the main checkout rule engine. If a delivery method should not be selectable for a specific postcode or product type, this function hides that method from checkout.
### What it uses
The function reads the customer shipping postcode, the customer shipping country, the products in the cart, the product delivery group metafield, and the delivery rates already configured in Shopify.
### Product metafield
Each product should have a delivery group metafield.
Namespace: custom
Key: delivery_group
Example delivery group values:
freestanding_laundry
integrated_laundry
cooker_hood
electric_installation
gas_installation
range_cookers
american_fridge_freezers
freestanding_refrigeration
integrated_refrigeration
small_appliances
free_delivery_eligible
The function also supports storefront aliases such as dual_fuel_range and american_fridge_freezer. These are normalised internally to the checkout delivery group names.

Products can also use a separate optional metafield.
Namespace: custom
Key: high_margin_free_delivery

This is not a delivery group. It is a separate product flag.
### Delivery zones
The function classifies delivery addresses into three main zones.
LE postcodes are treated as the local delivery area and can have additional services.
Excluded postcode prefixes are restricted areas where checkout delivery can be blocked.
Rest of UK postcodes use the standard UK delivery rules outside the LE local area.
### What the function does
Depending on the postcode and product delivery group, the function hides delivery methods that should not be available.
For LE postcodes, the checkout can show local services such as ground floor delivery, installation, disposal, floor delivery, gas certificate, or full service.
For Rest of UK postcodes, the checkout usually shows standard delivery options such as 1/2 Man Delivery Team or Pallet Delivery.
For American fridge freezer products outside LE, the checkout can be restricted to Pallet Delivery only.
For small appliances, the checkout can show Free Delivery or Next Day Parcel Delivery depending on the product or cart value.
For free_delivery_eligible products, the checkout can show Free Delivery when that is the only delivery group in the delivery group being rated.
If free_delivery_eligible is mixed with another delivery group, Rest of UK checkout uses the standard 1/2 Man Delivery Team and Pallet Delivery fallback.
For products marked with custom.high_margin_free_delivery, checkout keeps the normal LE local services for LE postcodes.
For products marked with custom.high_margin_free_delivery outside LE, checkout can show Free Delivery.
If all products in a local LE delivery group are marked with custom.high_margin_free_delivery, checkout can keep the combined local service set instead of falling back to base-only delivery.
If high margin free delivery products are mixed with regular products outside LE, the standard mixed basket rules still apply.
For restricted postcodes, the function can hide all checkout delivery methods so the customer cannot proceed with an invalid delivery option.
### Important note
The Delivery Customization Function cannot create new shipping rates or change shipping prices dynamically.
All shipping rates must already exist in Shopify. The function only decides which existing rates should remain visible and which rates should be hidden.
## 2. Checkout Postcode Banner
Extension name: delivery-postcode-banner
Type: Checkout UI Extension
Where it runs: Shopify checkout UI.
### Purpose
This extension displays a customer-facing warning message during checkout when the entered shipping postcode belongs to the restricted postcode list.
### What it shows
For restricted postcodes, the extension displays this message:
Delivery unavailable
We do not deliver to this region
### Responsibility
This extension is informational only.
It does not block checkout by itself. Checkout blocking is handled by the Delivery Customization Function by hiding invalid delivery methods.
This separation keeps the responsibilities clear. The Checkout UI Extension explains the issue to the customer, while the Delivery Customization Function enforces the delivery rules.
## 3. Product Delivery Checker
Extension name: product-delivery-checker
Type: Theme App Extension
Where it runs: Product pages and collection pages.
### Purpose
This extension adds an inline delivery checker block to product and collection pages.
The customer can enter a postcode before checkout and see which delivery services are expected to be available.
On a product page, the checker displays options for the selected product.
On a collection page, the checker can be placed near the top of the page and then injects delivery options into each visible product card.
### What the block contains
The block contains a postcode input field, a Check delivery button, validation messaging, and a result area.
On product pages, the result area lists available delivery services and prices for the product.
On collection pages, the result area confirms how many product cards were updated, and each product card receives its own list of delivery services and prices.
### How it works
The block reads the product delivery group from product.metafields.custom.delivery_group.
The block can also read product.metafields.custom.high_margin_free_delivery.
On collection pages, the block outputs a JSON dataset for the current visible collection page. Each item contains the product handle, title, URL, delivery group, and price.
The postcode is entered by the customer directly on the storefront page.
The calculation runs entirely in the browser. No backend request is made.
The collection block has a products per page setting. This should match the collection template pagination setting so the app block dataset lines up with the visible product cards.
### Stored postcode
The checker remembers the last entered postcode in the customer browser using localStorage.
This is only used to pre-fill the postcode field on future product or collection page visits. It is not sent to a custom server.
### Example local postcode result
For an LE postcode and an integrated laundry product, the checker may display something like this:
Delivery options for LE1 2AB
Available delivery services:
Free Ground Floor Delivery - £0
Unpack & Dispose Packaging - £9.99
1st Floor Delivery (No Lift) - £29.99
Install Your Appliance - £69.99
Disposal Of Old Appliance - £14.99
Full Service - £79.99
### Example restricted postcode result
For a restricted postcode, the checker displays an informational result such as this:
Delivery options for IV1 2AB
Delivery is not available for this postcode.
Checkout enforcement is still handled separately by the Delivery Customization Function.
## How the three extensions work together
The three extensions share the same business concept: products are assigned to delivery groups, and delivery availability depends on the customer postcode.
The overall flow works like this.
First, each product is assigned a custom.delivery_group metafield.
Second, the product and collection page checker uses that metafield to show estimated delivery services before checkout.
Third, at checkout, the Delivery Customization Function reads the cart, postcode, and product delivery groups.
Fourth, the function hides delivery rates that should not be available.
Finally, if the postcode is restricted, the Checkout Postcode Banner explains the issue to the customer.
## Data setup required in Shopify
For the extensions to work correctly, Shopify must be configured with product metafields using custom.delivery_group.
If the high margin free delivery rule is needed for a product, Shopify should also set custom.high_margin_free_delivery for that product.
Shopify must also have shipping rates with names and prices that match the delivery service configuration.
The Theme App Extension block should be added to the product page template and can also be added above the collection section on collection templates.
For collection templates, the block products per page setting should match the collection section products per page setting.
The Checkout UI Extension should be enabled in checkout customisation.
The Delivery Customization Function should be enabled in Shopify.
## Key operational notes
The checkout function is the source of truth for what customers can select at checkout.
The product and collection page checker is a frontend guide for customers before checkout.
For restricted postcodes, the checker matches checkout by showing that delivery is unavailable.
The checkout banner is informational and does not enforce rules by itself.
The app is built for United Kingdom delivery rules.
The logic is designed to be extended with additional delivery groups and services if needed.
