const $ = (id) => document.getElementById(id);

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.detail = data.detail;
    err.status = res.status;
    throw err;
  }
  return data;
}

function fillSelect(el, values, labelFn = (v) => v) {
  el.innerHTML = values
    .map((v) => {
      const label = typeof v === "string" ? v : labelFn(v);
      const value = typeof v === "string" ? v : v.name;
      return `<option value="${escapeAttr(value)}">${escapeHtml(label)}</option>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', "&quot;");
}

function stipend(n) {
  if (n == null) return "FTE";
  if (n === 0) return "Unpaid intern";
  return `₹${n.toLocaleString("en-IN")}/mo`;
}

async function boot() {
  const health = $("health");
  try {
    await getJson("/api/health");
    health.textContent = "CognoDB connected";
    health.classList.add("ok");
  } catch (err) {
    health.textContent = "Graph unreachable — seed after setting .env";
    health.classList.add("bad");
  }

  try {
    const [stations, skills, companies] = await Promise.all([
      getJson("/api/stations"),
      getJson("/api/skills"),
      getJson("/api/companies"),
    ]);
    fillSelect(
      $("from"),
      stations,
      (s) => `${s.name} (${s.lines.join(" / ")})`
    );
    fillSelect($("skill"), skills);
    fillSelect($("coA"), companies);
    fillSelect($("coB"), companies);
    $("from").value = stations.some((s) => s.name === "Ameerpet")
      ? "Ameerpet"
      : stations[0]?.name;
    $("skill").value = skills.includes("React") ? "React" : skills[0];
    $("coA").value = companies.includes("Wexa AI") ? "Wexa AI" : companies[0];
    $("coB").value = companies.includes("Microsoft") ? "Microsoft" : companies[1] || companies[0];
  } catch {
    /* health banner already explains */
  }
}

$("hops").addEventListener("input", () => {
  $("hopsVal").textContent = $("hops").value;
});

$("search").addEventListener("click", async () => {
  $("error").hidden = true;
  $("empty").hidden = true;
  $("results").hidden = true;
  $("loading").hidden = false;
  $("resultMeta").textContent = "";
  try {
    const from = $("from").value;
    const skill = $("skill").value;
    const maxHops = $("hops").value;
    const rows = await getJson(
      `/api/reachable?from=${encodeURIComponent(from)}&skill=${encodeURIComponent(skill)}&maxHops=${maxHops}`
    );
    $("loading").hidden = true;
    if (!rows.length) {
      $("empty").hidden = false;
      $("empty").textContent = `No ${skill} roles within ${maxHops} hops of ${from}.`;
      return;
    }
    $("resultMeta").textContent = `${rows.length} role${rows.length === 1 ? "" : "s"}`;
    $("results").hidden = false;
    $("results").innerHTML = rows
      .map(
        (r) => `<li>
          <div class="hop">${r.hops}<span>hop${r.hops === 1 ? "" : "s"}</span></div>
          <div>
            <div class="title">${escapeHtml(r.title)}</div>
            <div class="sub">${escapeHtml(r.company)} · ${escapeHtml(r.industry)} · ${escapeHtml(r.station)} · ${r.walkMin} min walk</div>
          </div>
          <span class="pill">${escapeHtml(stipend(r.stipend))}</span>
        </li>`
      )
      .join("");
  } catch (err) {
    $("loading").hidden = true;
    $("error").hidden = false;
    $("error").textContent = err.message + (err.detail ? ` — ${err.detail}` : "");
  }
});

$("between").addEventListener("click", async () => {
  const out = $("betweenOut");
  out.textContent = "Finding shortest metro path…";
  try {
    const rows = await getJson(
      `/api/between?a=${encodeURIComponent($("coA").value)}&b=${encodeURIComponent($("coB").value)}`
    );
    if (!rows.length) {
      out.textContent = "No path. Seed the graph first.";
      return;
    }
    const p = rows[0];
    out.textContent = `${p.hops} hop${p.hops === 1 ? "" : "s"}: ${p.stations.join(" → ")}`;
  } catch (err) {
    out.textContent = err.message;
  }
});

boot();
