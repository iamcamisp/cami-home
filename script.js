let DATA = null;
let STATUS_FILTER = "all";

async function load() {
  try {
    const res = await fetch(`items.json?v=${Date.now()}`);
    DATA = await res.json();
    render();
    setupScrollSpy();
    setupFilters();
  } catch (err) {
    document.getElementById("rooms").innerHTML =
      `<p class="loading">Could not load list.</p>`;
    console.error(err);
  } finally {
    document.getElementById("rooms").setAttribute("aria-busy", "false");
  }
}

function statusOf(it) {
  if (it.status) return it.status;
  if (it.bought) return "owned";
  return "planned";
}

function setupFilters() {
  document.querySelectorAll(".filters button").forEach((b) => {
    b.addEventListener("click", () => {
      STATUS_FILTER = b.dataset.status;
      document.querySelectorAll(".filters button").forEach((x) =>
        x.classList.toggle("active", x === b)
      );
      render();
      setupScrollSpy();
    });
  });
}

function render() {
  if (!DATA) return;
  const allRooms = (DATA.rooms || []).filter((r) => r && r.slug && r.name);
  // Filter items per room by status
  const rooms = allRooms.map((r) => ({
    ...r,
    items: (r.items || []).filter(
      (it) => STATUS_FILTER === "all" || statusOf(it) === STATUS_FILTER
    ),
  }));

  document.querySelector(".room-nav-inner").innerHTML = rooms
    .map(
      (r) =>
        `<a href="#${escapeAttr(r.slug)}" data-slug="${escapeAttr(r.slug)}">${escape(r.name)}</a>`
    )
    .join("");

  document.getElementById("rooms").innerHTML = rooms.map((r) => renderRoom(r)).join("");
}

function renderRoom(room) {
  const items = room.items || [];
  const count = items.length;
  const body = count
    ? `<div class="grid">${items.map((it) => renderCard(it)).join("")}</div>`
    : `<p class="room-empty">No pieces yet.</p>`;
  return `
    <section class="room" id="${escapeAttr(room.slug)}">
      <div class="room-header">
        <h2>${escape(room.name)}</h2>
        <span class="count">${count} ${count === 1 ? "piece" : "pieces"}</span>
      </div>
      ${body}
    </section>
  `;
}

function renderCard(it) {
  const url = it.url || "#";
  const status = statusOf(it);
  const image = it.image_url
    ? `<div class="image"><img src="${escapeAttr(it.image_url)}" alt="${escapeAttr(it.name || "")}" loading="lazy" onerror="this.parentElement.classList.add('broken')"/></div>`
    : `<div class="image broken"></div>`;

  const store = it.store ? `<div class="store">${escape(it.store)}</div>` : "";
  let detail = "";
  if (status === "owned" || status === "sold" || status === "to-sell") {
    const parts = [];
    if (it.price_chf != null) parts.push(fmtCHF(it.price_chf));
    if ((status === "owned" || status === "to-sell") && it.date_bought) parts.push(fmtDate(it.date_bought));
    if (status === "sold" && it.date_sold) parts.push(`sold ${fmtDate(it.date_sold)}`);
    const line = parts.length
      ? `<div class="meta">${parts.map(escape).join(" · ")}</div>`
      : "";
    const dims = it.dimensions
      ? `<div class="dims">${escape(it.dimensions)}</div>`
      : "";
    detail = `${line}${dims}`;
  } else if (it.dimensions) {
    detail = `<div class="dims">${escape(it.dimensions)}</div>`;
  }
  const tagText =
    status === "owned" ? "Owned" :
    status === "to-sell" ? "To sell" :
    status === "sold" ? "Sold" : "";
  const tag = tagText ? `<div class="status-tag tag-${status}">${tagText}</div>` : "";

  return `
    <a class="card status-${status}" href="${escapeAttr(url)}" target="_blank" rel="noopener">
      ${image}
      <div class="content">
        ${tag}
        <div class="name">${escape(it.name || "")}</div>
        ${store}
        ${detail}
      </div>
      <div class="action"><span class="view">View →</span></div>
    </a>
  `;
}

function fmtCHF(n) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function setupScrollSpy() {
  const links = Array.from(document.querySelectorAll(".room-nav a"));
  if (!links.length) return;
  const bySlug = Object.fromEntries(links.map((a) => [a.dataset.slug, a]));
  const setActive = (slug) => {
    links.forEach((a) => a.classList.toggle("active", a.dataset.slug === slug));
  };
  const observer = new IntersectionObserver(
    (entries) => {
      // Pick the section closest to the top that's still in view
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        const slug = visible[0].target.id;
        if (bySlug[slug]) setActive(slug);
      }
    },
    { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
  );
  document.querySelectorAll(".room").forEach((s) => observer.observe(s));
  setActive(links[0].dataset.slug);
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return escape(s);
}

load();
