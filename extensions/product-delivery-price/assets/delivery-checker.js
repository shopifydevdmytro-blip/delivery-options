(() => {
  const K = "deliveryChecker.postcode";
  const FREE_OVER = 50;
  const BAD = "Delivery is not available for this postcode.";
  const RX = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;
  const INSTALL = "Install Your Appliance (Must be a like for like appliance & existing pipework all ready)";
  const DISPOSAL = "Disposal Of Old Appliance (Must Be Disconnected)";
  const FULL =
    "Full Service (Delivery / Fitting & Disposal Of Old Appliance / Doesn't Include Disposal Of Packaging)";
  const CONTACT = "Our Sales Team Will Get In Touch";
  const X = {
    AB: [[10, 16], [21, 25], [30, 39], [41, 45], [51, 56]],
    BT: [[1, 49], [51, 57], [60, 71], [74, 82], [92, 94]],
    CF: [[47, 47]],
    CR: [[9, 9]],
    DD: [[1, 11]],
    DG: [[5, 9]],
    FK: [[8, 9], [11, 12], [14, 21]],
    G: [[63, 63], [83, 84]],
    HS: [[1, 9]],
    IM: [[1, 9], [86, 87], [99, 99]],
    IV: [[1, 28], [30, 32], [36, 36], [40, 49], [51, 56], [63, 63]],
    KA: [[26, 28]],
    KW: [[1, 3], [5, 17]],
    KY: [[6, 10], [13, 16]],
    PA: [[20, 38], [41, 49], [60, 78], [80, 80]],
    PH: [[1, 26], [30, 44], [49, 50]],
    PO: [[30, 41]],
    TR: [[21, 25]],
  };
  const S = {
    g: ["Free Ground Floor Delivery", 0],
    fd: ["Free Delivery", 0],
    u: ["Unpack & Dispose Packaging", 9.99],
    i24: [INSTALL, 24.99],
    i39: [INSTALL, 39.99],
    i69: [INSTALL, 69.99],
    i79: [INSTALL, 79.99],
    fit: ["Fitting Of New Appliance", 69.99],
    d14: [DISPOSAL, 14.99],
    d29: [DISPOSAL, 29.99],
    d49: [DISPOSAL, 49.99],
    gas: ["Gas Safe Certificate", 24.99],
    door: ["Doors Off To Fit In Property", 49.99],
    f1: ["1st Floor Delivery (No Lift)", 29.99],
    f1c: ["1st Floor Delivery (No Lift)", null, CONTACT],
    f2c: ["2nd Floor Or More Delivery (No Lift)", null, CONTACT],
    fs34: [FULL, 34.99],
    fs49: [FULL, 49.99],
    fs79: [FULL, 79.99],
    fs99: [FULL, 99.99],
    fs119: [FULL, 119.99],
    team: ["1/2 Man Delivery Team (2 - 10 Working Days)", 29.99],
    pal: ["Pallet Delivery (Kurbside Only & 1 - 3 Working Day Delivery)", 39.99],
    par: ["Next Day Parcel Delivery", 4.99],
  };
  const R = {
    freestanding_laundry: ["g u f1 f2c i24 d14 fs34", "std"],
    integrated_laundry: ["g u f1 f2c i69 d14 fs79", "std"],
    cooker_hood: ["g u f1 f2c i69 d14 fs79", "std"],
    electric_installation: ["g u f1 f2c i39 d14 fs49", "std"],
    gas_installation: ["g u f1 f2c i69 d14 gas fs99", "std"],
    range_cookers: ["g u f1 f2c i79 d14 gas fs119", "std"],
    american_fridge_freezers: ["g u door f1c f2c d49", "pal"],
    freestanding_refrigeration: ["g u f1 f2c d29", "std"],
    integrated_refrigeration: ["g u f1 f2c fit d29 fs99", "std"],
    small_appliances: ["fd", "small"],
    free_delivery_eligible: ["fd", "free"],
    unconfigured: ["g", "std"],
  };

  function q(root, sel) {
    return root.querySelector(sel);
  }

  function qa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function add(parent, tag, cls, text) {
    const n = document.createElement(tag);
    n.className = cls;
    n.textContent = text;
    parent.appendChild(n);
    return n;
  }

  function empty(n) {
    while (n.firstChild) n.removeChild(n.firstChild);
  }

  function pc(v) {
    return String(v || "")
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function showPc(v) {
    return v.length > 3 ? v.slice(0, -3) + " " + v.slice(-3) : v;
  }

  function group(v) {
    const k = String(v || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (R[k]) return k;
    if (["dual_fuel_range", "dual_fuel_range_cookers", "range_cooker"].indexOf(k) >= 0)
      return "range_cookers";
    if (k === "american_fridge_freezer") return "american_fridge_freezers";
    return "unconfigured";
  }

  function highMargin(v) {
    const k = String(v || "")
      .trim()
      .toLowerCase();
    return (
      k === "true" ||
      k === "1" ||
      k === "yes" ||
      k === "on" ||
      k === "high_margin_free_delivery"
    );
  }

  function excluded(postcode) {
    const m = postcode.match(/^([A-Z]{1,2})([0-9]{1,2})/);
    return !!(m && X[m[1]] && X[m[1]].some((r) => +m[2] >= r[0] && +m[2] <= r[1]));
  }

  function zone(postcode) {
    const p = pc(postcode);
    if (!p) return "unknown";
    if (p[0] === "L" && p[1] === "E") return "le";
    return excluded(p) ? "excluded" : "uk";
  }

  function svc(k) {
    const s = S[k] || ["", null, ""];
    return { title: s[0], price: s[1], label: s[2] || "" };
  }

  function calc({ group: g, highMarginFreeDelivery, postcode, price }) {
    const z = zone(postcode);
    if (z === "excluded" || z === "unknown") {
      return { postcode: showPc(pc(postcode)), heading: "", notice: BAD, services: [] };
    }
    const r = R[group(g)];
    if (z === "le") {
      return {
        postcode: showPc(pc(postcode)),
        heading: "Available delivery services:",
        notice: "",
        services: r[0].split(" ").map(svc),
      };
    }
    if (highMargin(highMarginFreeDelivery)) {
      return {
        postcode: showPc(pc(postcode)),
        heading: "Available delivery:",
        notice: "",
        services: [svc("fd")],
      };
    }
    let keys = "team pal";
    if (r[1] === "pal") keys = "pal";
    if (r[1] === "free") keys = "fd";
    if (r[1] === "small") keys = price > FREE_OVER ? "fd" : "par";
    return {
      postcode: showPc(pc(postcode)),
      heading: "Available delivery:",
      notice: "",
      services: keys.split(" ").map(svc),
    };
  }

  function price(s) {
    if (s.label) return s.label;
    if (s.price === 0) return "£0";
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(s.price);
  }

  function renderBox(box, result) {
    empty(box);
    add(box, "p", "delivery-checker__result-title", "Delivery options for " + result.postcode);
    if (result.notice) add(box, "p", "delivery-checker__notice", result.notice);
    if (result.heading) add(box, "p", "delivery-checker__notice", result.heading);
    if (!result.services.length) return;
    const ul = add(box, "ul", "delivery-checker__service-list", "");
    result.services.forEach((s) => {
      const li = add(ul, "li", "delivery-checker__service", "");
      add(li, "span", "delivery-checker__service-name", s.title);
      add(li, "span", "delivery-checker__service-price", price(s));
    });
  }

  function renderCard(card, id, result) {
    const actions = q(card, ".productitem--actions");
    const container = q(card, ".productitem__container");
    const target = q(card, ".productitem--info") || q(card, "[data-product-item-content]") || card;
    const wrap = document.createElement("div");
    wrap.className = "delivery-checker-card delivery-checker-card--collection-card";
    wrap.dataset.deliveryCheckerCardResult = id || "true";

    if (container && actions && actions.parentElement === container) {
      container.classList.add("productitem__container--delivery-checked");
      container.insertBefore(wrap, actions);
    } else if (actions) {
      actions.insertBefore(wrap, actions.firstChild);
    } else {
      target.appendChild(wrap);
    }

    add(wrap, "p", "delivery-checker-card__title", "Delivery options for " + result.postcode);
    if (result.notice) add(wrap, "p", "delivery-checker-card__notice", result.notice);
    if (result.heading && result.services.length) add(wrap, "p", "delivery-checker-card__notice", result.heading);
    if (!result.services.length) return;
    const ul = add(wrap, "ul", "delivery-checker-card__service-list", "");
    result.services.forEach((s) => {
      const li = add(ul, "li", "delivery-checker-card__service", "");
      add(li, "span", "delivery-checker-card__service-name", s.title);
      add(li, "span", "delivery-checker-card__service-price", price(s));
    });
  }

  function products(block) {
    const n = q(block, "[data-delivery-checker-products]");
    try {
      const parsed = n ? JSON.parse(n.textContent || "[]") : [];
      if (parsed.length) {
        return parsed.map((p) => ({
          handle: String(p.handle || ""),
          title: String(p.title || ""),
          url: String(p.url || ""),
          deliveryGroup: String(p.deliveryGroup || ""),
          highMarginFreeDelivery: String(p.highMarginFreeDelivery || ""),
          priceCents: Number(p.priceCents || 0),
        }));
      }
    } catch (e) {}
    return [{
      deliveryGroup: block.dataset.deliveryGroup,
      highMarginFreeDelivery: block.dataset.highMarginFreeDelivery,
      priceCents: Number(block.dataset.productPriceCents || 0),
    }];
  }

  function handleFromUrl(url) {
    try {
      const parts = new URL(url, window.location.origin).pathname.split("/").filter(Boolean);
      const i = parts.indexOf("products");
      return decodeURIComponent((i >= 0 ? parts[i + 1] : parts[parts.length - 1]) || "");
    } catch (e) {
      const parts = String(url || "")
        .split("?")[0]
        .split("#")[0]
        .split("/")
        .filter(Boolean);
      const i = parts.indexOf("products");
      return decodeURIComponent((i >= 0 ? parts[i + 1] : parts[parts.length - 1]) || "");
    }
  }

  function clear(block) {
    const id = block.dataset.deliveryCheckerId;
    qa(document, "[data-delivery-checker-card-result]").forEach((n) => {
      if (!id || n.dataset.deliveryCheckerCardResult === id) {
        const parent = n.parentElement;
        n.remove();
        if (parent && !q(parent, ".delivery-checker-card")) {
          parent.classList.remove("productitem__container--delivery-checked");
        }
      }
    });
  }

  function stored() {
    try {
      return pc(window.localStorage.getItem(K));
    } catch (e) {
      return "";
    }
  }

  function store(postcode) {
    try {
      window.localStorage.setItem(K, pc(postcode));
    } catch (e) {}
  }

  function setMsg(n, text, type) {
    n.className = type ? "delivery-checker__message delivery-checker__message--" + type : "delivery-checker__message";
    n.textContent = text;
  }

  function setLoad(btn, on) {
    if (on) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "Checking...";
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.originalText || "Check delivery";
      btn.disabled = false;
    }
  }

  function check(block, input, btn, msg, box) {
    const postcode = pc(input.value);
    const isCollection = block.dataset.deliveryCheckerContext === "collection";
    setMsg(msg, "", "");
    empty(box);
    if (isCollection) clear(block);
    if (!RX.test(postcode)) return setMsg(msg, "Please enter a full UK postcode, e.g. LE1 2AB.", "error");
    input.value = showPc(postcode);
    store(postcode);
    setLoad(btn, true);
    window.setTimeout(() => {
      const list = products(block);
      if (!isCollection) {
        const p = list[0] || {};
        renderBox(box, calc({
          group: p.deliveryGroup,
          highMarginFreeDelivery: p.highMarginFreeDelivery,
          postcode,
          price: Number(p.priceCents || 0) / 100,
        }));
      } else {
        const byHandle = {};
        list.forEach((p) => {
          if (p.handle) byHandle[p.handle] = p;
        });
        let count = 0;
        qa(document, "[data-productgrid-items] [data-product-item]").forEach((card) => {
          const link = q(card, "[data-product-page-link]");
          const p = link && byHandle[handleFromUrl(link.getAttribute("href") || link.href || "")];
          if (!p) return;
          renderCard(card, block.dataset.deliveryCheckerId, calc({
            group: p.deliveryGroup,
            highMarginFreeDelivery: p.highMarginFreeDelivery,
            postcode,
            price: Number(p.priceCents || 0) / 100,
          }));
          count += 1;
        });
        add(
          box,
          "p",
          count ? "delivery-checker__result-title" : "delivery-checker__notice",
          count
            ? "Delivery options added to " + count + " products for " + showPc(postcode)
            : "No matching product cards were found on this collection page.",
        );
      }
      setLoad(btn, false);
    }, 100);
  }

  function init() {
    qa(document, "[data-delivery-checker]").forEach((block) => {
      if (block.dataset.deliveryCheckerInitialized) return;
      block.dataset.deliveryCheckerInitialized = "true";
      const input = q(block, "[data-delivery-checker-input]");
      const btn = q(block, "[data-delivery-checker-button]");
      const msg = q(block, "[data-delivery-checker-message]");
      const box = q(block, "[data-delivery-checker-results]");
      if (!input || !btn || !msg || !box) return;
      const p = stored();
      if (p && !input.value) input.value = showPc(p);
      btn.addEventListener("click", () => check(block, input, btn, msg, box));
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        check(block, input, btn, msg, box);
      });
      input.addEventListener("input", () => {
        setMsg(msg, "", "");
        empty(box);
        if (block.dataset.deliveryCheckerContext === "collection") clear(block);
      });
    });
  }

  if (typeof window !== "undefined") {
    window.ProductDeliveryChecker = {
      calculateDeliveryResult: calc,
      classifyDeliveryLocation: zone,
      displayPostcode: showPc,
      handleFromUrl,
      isHighMarginFreeDelivery: highMargin,
      normalizeDeliveryGroup: group,
      normalizePostcode: pc,
    };
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
})();
