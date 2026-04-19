import {classifyDeliveryLocation} from '../../shared/delivery/postcodes';

export default function extension() {
  renderBanner();

  return shopify.shippingAddress?.subscribe?.(renderBanner);
}

function renderBanner() {
  const shippingAddress = shopify.shippingAddress?.value;
  const deliveryZone = classifyDeliveryLocation({
    postcode: shippingAddress?.zip,
    countryCode: shippingAddress?.countryCode,
  });

  if (deliveryZone !== 'excluded') {
    document.body.replaceChildren();
    return;
  }

  const banner = document.createElement('s-banner');
  banner.setAttribute('heading', 'Delivery unavailable');
  banner.setAttribute('tone', 'critical');
  banner.textContent = 'We do not deliver to this region';

  document.body.replaceChildren(banner);
}
