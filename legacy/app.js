const CLAIMS_KEY = "wedding-registry-claimed-v1";

let registryData = null;
let claimedIds = new Set();

function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  if (Number.isNaN(number)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(number);
}

function safeURL(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    return u.toString();
  } catch {
    return "";
  }
}

function safeAssetURL(url) {
  if (!url) return "";
  try {
    if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
      return new URL(url, location.href).toString();
    }
    const u = new URL(url, location.href);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    return u.toString();
  } catch {
    return "";
  }
}

function showNotice(message, type = "info") {
  const notice = qs("#notice");
  if (!message) {
    notice.hidden = true;
    notice.textContent = "";
    notice.className = "notice";
    return;
  }
  notice.hidden = false;
  notice.textContent = message;
  notice.className = `notice notice-${type}`;
}

function loadClaims() {
  try {
    const raw = localStorage.getItem(CLAIMS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === "string" && id));
  } catch {
    return new Set();
  }
}

function saveClaims() {
  localStorage.setItem(CLAIMS_KEY, JSON.stringify([...claimedIds]));
}

function toggleClaim(id) {
  if (claimedIds.has(id)) {
    claimedIds.delete(id);
  } else {
    claimedIds.add(id);
  }
  saveClaims();
  if (registryData) {
    render(prepareItems(registryData.items));
    updateResetButton(registryData.items);
  }
}

function resetAllClaims() {
  if (!claimedIds.size) return;
  const ok = window.confirm(
    "Remove all purchased marks on this device? This cannot be undone for other guests' browsers."
  );
  if (!ok) return;
  claimedIds.clear();
  saveClaims();
  if (registryData) {
    render(prepareItems(registryData.items));
    updateResetButton(registryData.items);
  }
}

function prepareItems(rawItems) {
  if (!rawItems || rawItems.length === 0) return [];
  return rawItems.map((x) => ({
    id: x.id || "",
    title: x.title || "Untitled",
    price: typeof x.price === "number" ? x.price : null,
    link: safeURL(x.link || ""),
    image: safeAssetURL(x.image || ""),
    notes: x.notes ? String(x.notes) : "",
    claimed: x.id ? claimedIds.has(x.id) : false,
  }));
}

function updateHeader(data) {
  const titleEl = qs("#pageTitle");
  const subtitleEl = qs("#pageSubtitle");
  const names = data.coupleNames?.trim();
  const pageTitle = data.title?.trim();

  if (names) {
    titleEl.textContent = names;
    subtitleEl.textContent = pageTitle || "Wedding Registry";
    subtitleEl.hidden = false;
  } else if (pageTitle) {
    titleEl.textContent = pageTitle;
    subtitleEl.hidden = true;
  } else {
    titleEl.textContent = "Wedding Registry";
    subtitleEl.hidden = true;
  }

  document.title = titleEl.textContent;
}

function updateResetButton(items) {
  const resetBtn = qs("#resetClaims");
  const claimed = items.filter((item) => item.id && claimedIds.has(item.id)).length;
  resetBtn.hidden = claimed === 0;
}

function bindClaimButton(btn, item) {
  if (!item.id) {
    btn.disabled = true;
    btn.textContent = "No item id";
    return;
  }

  const sync = () => {
    const isClaimed = claimedIds.has(item.id);
    btn.classList.toggle("is-claimed", isClaimed);
    btn.setAttribute("aria-pressed", String(isClaimed));
    btn.textContent = isClaimed ? "Undo purchased" : "Mark as purchased";
  };

  sync();
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleClaim(item.id);
  });
}

function render(items) {
  const list = qs("#items");
  const empty = qs("#listEmpty");
  list.innerHTML = "";

  if (!items.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  const template = qs("#itemTemplate");

  items.forEach((item) => {
    const node = template.content.cloneNode(true);
    const li = qs("li", node);
    const img = qs(".thumb", node);
    const badge = qs(".purchased-badge", node);
    const titleEl = qs(".card-title", node);
    const priceEl = qs(".price", node);
    const notesEl = qs(".notes", node);
    const claimBtn = qs(".claim-btn", node);

    titleEl.textContent = item.title || "Untitled";
    priceEl.textContent = formatPrice(item.price);
    notesEl.textContent = item.notes || "";

    const isClaimed = item.id && claimedIds.has(item.id);
    if (isClaimed) {
      li.classList.add("claimed");
      badge.hidden = false;
    }

    const imgUrl = item.image;
    if (imgUrl) {
      img.src = imgUrl;
      img.alt = item.title ? `${item.title} image` : "Registry item image";
      img.addEventListener("error", () => {
        img.removeAttribute("src");
        img.alt = "Image unavailable";
        li.classList.add("no-image");
      });
    } else {
      li.classList.add("no-image");
    }

    bindClaimButton(claimBtn, item);

    const productUrl = item.link;
    if (productUrl) {
      li.classList.add("clickable");
      li.tabIndex = 0;
      li.setAttribute("role", "link");
      li.setAttribute("aria-label", `Open ${item.title} at store`);

      const openStore = () => {
        window.open(productUrl, "_blank", "noopener,noreferrer");
      };

      li.addEventListener("click", (e) => {
        if (e.target.closest(".claim-btn")) return;
        openStore();
      });

      li.addEventListener("keydown", (e) => {
        if (e.target.closest(".claim-btn")) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openStore();
        }
      });
    }

    list.appendChild(node);
  });
}

async function loadRegistry() {
  showNotice("Loading registry…", "loading");
  try {
    const res = await fetch("./items.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Could not load items.json (${res.status})`);
    }
    const data = await res.json();
    if (!data || !Array.isArray(data.items)) {
      throw new Error("items.json must include an items array");
    }

    const missingIds = data.items.filter((item) => !item.id);
    if (missingIds.length) {
      console.warn(
        "Some items are missing id — purchased marks will not work for them.",
        missingIds
      );
    }

    registryData = data;
    showNotice("");
    updateHeader(data);
    const items = prepareItems(data.items);
    render(items);
    updateResetButton(data.items);
  } catch (err) {
    showNotice(
      err.message ||
        "Failed to load registry. Serve this folder over HTTP (Live Server or npx serve).",
      "error"
    );
    qs("#listEmpty").hidden = true;
  }
}

function init() {
  claimedIds = loadClaims();
  qs("#resetClaims").addEventListener("click", resetAllClaims);
  loadRegistry();
}

document.addEventListener("DOMContentLoaded", init);
