const LINES = { Red: "#e31e24", Blue: "#0078c8", Green: "#00a651" };

const state = {
  graph: null,
  from: "HITEC City",
  skill: "Graphs",
  maxHops: 4,
  query: "reachable",
  lit: new Set(),
  selected: null,
  cypher: "",
  ms: null,
  rows: [],
  live: false,
  detail: null,
};

function el(tag, attrs, kids) {
  const n = document.createElement(tag);
  attrs = attrs || {};
  for (const k of Object.keys(attrs)) {
    if (k === "on") {
      for (const ev of Object.keys(attrs.on)) n.addEventListener(ev, attrs.on[ev]);
    } else if (k === "dataset") {
      Object.assign(n.dataset, attrs.dataset);
    } else if (k === "style" && typeof attrs[k] === "object") {
      Object.assign(n.style, attrs[k]);
    } else if (attrs[k] === false || attrs[k] == null) {
      /* skip */
    } else if (attrs[k] === true) {
      n.setAttribute(k, "");
    } else {
      n.setAttribute(k, attrs[k]);
    }
  }
  for (const kid of kids || []) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return n;
}

function svgEl(tag, attrs) {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k of Object.keys(attrs || {})) n.setAttribute(k, attrs[k]);
  return n;
}

async function getJson(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || res.statusText), { body, status: res.status });
  return body;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function layout(graph, w, h) {
  const pos = {};
  const padX = 56;
  const padY = 48;
  const orders = graph.orders || {};
  const blue = orders.Blue || [];
  const red = orders.Red || [];
  const green = orders.Green || [];

  blue.forEach((name, i) => {
    const t = blue.length < 2 ? 0.5 : i / (blue.length - 1);
    pos[name] = { x: lerp(padX, w - padX, t), y: h * 0.42 };
  });

  const ap = pos["Ameerpet"] || { x: w * 0.42, y: h * 0.42 };
  const apIdx = red.indexOf("Ameerpet");
  red.forEach((name, i) => {
    if (name === "Ameerpet" && pos[name]) return;
    const t = i - (apIdx < 0 ? 0 : apIdx);
    pos[name] = { x: ap.x + t * 16, y: ap.y + t * 18 };
  });

  const pg = pos["Parade Ground"] || { x: w * 0.58, y: h * 0.42 };
  const pgIdx = green.indexOf("Parade Ground");
  green.forEach((name, i) => {
    if (pos[name] && (name === "Parade Ground" || name === "MG Bus Station")) return;
    const t = i - (pgIdx < 0 ? 0 : pgIdx);
    pos[name] = { x: pg.x + 28, y: pg.y + t * 28 };
  });

  const used = {};
  for (const node of graph.nodes) {
    if (node.kind !== "company") continue;
    const home = pos[node.station] || { x: w / 2, y: h / 2 };
    const n = used[node.station] || 0;
    used[node.station] = n + 1;
    const ang = -0.9 + n * 0.55;
    pos[node.id] = {
      x: home.x + Math.cos(ang) * 42,
      y: home.y - 36 - n * 18 + Math.sin(ang) * 10,
    };
  }

  for (const node of graph.nodes) {
    if (node.kind === "station") {
      node.x = (pos[node.name] || { x: w / 2, y: h / 2 }).x;
      node.y = (pos[node.name] || { x: w / 2, y: h / 2 }).y;
    } else {
      node.x = (pos[node.id] || { x: w / 2, y: h / 2 }).x;
      node.y = (pos[node.id] || { x: w / 2, y: h / 2 }).y;
    }
  }
}

function colorFor(node) {
  if (node.kind === "company") return "#9b7dff";
  if (node.colors && node.colors[0]) return node.colors[0];
  if (node.lines && node.lines[0]) return LINES[node.lines[0]] || "#888";
  return "#888";
}

function isLit(id) {
  if (!state.lit.size) return true;
  return state.lit.has(id);
}

function draw() {
  const svg = document.getElementById("map");
  if (!svg || !state.graph) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const w = svg.clientWidth || 900;
  const h = svg.clientHeight || 640;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  layout(state.graph, w, h);

  const byId = Object.fromEntries(state.graph.nodes.map((n) => [n.id, n]));
  const edgesG = svgEl("g", {});
  const nodesG = svgEl("g", {});
  svg.append(edgesG, nodesG);

  for (const e of state.graph.edges) {
    const a = byId[e.source];
    const b = byId[e.target];
    if (!a || !b) continue;
    const lit = isLit(e.source) && isLit(e.target);
    const line = svgEl("line", {
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      stroke: e.kind === "NEAR" ? "#6b5ca5" : LINES[e.line] || "#444",
      "stroke-width": e.kind === "NEAR" ? 1.2 : 3.4,
      "stroke-opacity": lit ? (e.kind === "NEAR" ? 0.7 : 0.92) : 0.12,
      "stroke-dasharray": e.kind === "NEAR" ? "3 4" : "none",
    });
    edgesG.append(line);
  }

  for (const node of state.graph.nodes) {
    const g = svgEl("g", { "data-id": node.id, style: "cursor:pointer" });
    const lit = isLit(node.id);
    const selected = state.selected && state.selected.id === node.id;
    const r = node.kind === "station" ? (node.lines && node.lines.length > 1 ? 8 : 6) : 7;

    if (node.kind === "company") {
      const rect = svgEl("rect", {
        x: node.x - 7,
        y: node.y - 7,
        width: 14,
        height: 14,
        rx: 3,
        fill: colorFor(node),
        opacity: lit ? 1 : 0.18,
        stroke: selected ? "#fff" : "none",
        "stroke-width": selected ? 2 : 0,
      });
      g.append(rect);
    } else if (node.lines && node.lines.length > 1) {
      g.append(
        svgEl("circle", {
          cx: node.x,
          cy: node.y,
          r: r + 3,
          fill: "#07080c",
          stroke: "#fff",
          "stroke-width": 1.4,
          opacity: lit ? 1 : 0.2,
        })
      );
      g.append(
        svgEl("circle", {
          cx: node.x,
          cy: node.y,
          r: r,
          fill: colorFor(node),
          opacity: lit ? 1 : 0.18,
        })
      );
    } else {
      g.append(
        svgEl("circle", {
          cx: node.x,
          cy: node.y,
          r: r,
          fill: colorFor(node),
          opacity: lit ? 1 : 0.16,
          stroke: selected ? "#fff" : "none",
          "stroke-width": selected ? 2 : 0,
        })
      );
    }

    const showLabel =
      node.kind === "company" ||
      (node.lines && node.lines.length > 1) ||
      node.name === state.from ||
      (lit && state.lit.size > 0 && node.kind === "station" && state.lit.has(node.id));

    if (showLabel) {
      const t = svgEl("text", {
        x: node.x + 10,
        y: node.y + 4,
        fill: lit ? "#e8eaef" : "#5c6170",
        "font-size": node.kind === "company" ? 11 : 10,
        "font-family": "IBM Plex Sans, system-ui, sans-serif",
      });
      t.textContent = node.name;
      g.append(t);
    }

    g.addEventListener("click", () => selectNode(node));
    nodesG.append(g);
  }
}

async function selectNode(node) {
  state.selected = node;
  state.detail = node;
  if (node.kind === "company") {
    try {
      const data = await getJson("/api/expand?name=" + encodeURIComponent(node.name));
      state.detail = { ...node, roles: data.roles, cypher: data.cypher, ms: data.ms };
      if (data.cypher) state.cypher = data.cypher;
    } catch (err) {
      state.detail = { ...node, error: err.message };
    }
  }
  paintChrome();
  draw();
}

const QUERIES = [
  { id: "reachable", label: "Reachable jobs" },
  { id: "corridor", label: "Company corridor" },
  { id: "city", label: "Whole network" },
];

async function runQuery() {
  const status = document.getElementById("status");
  try {
    if (state.query === "city") {
      state.lit = new Set();
      state.rows = [];
      state.cypher = state.graph ? state.graph.cypher : "";
      state.ms = state.graph ? state.graph.ms : null;
    } else if (state.query === "corridor") {
      const data = await getJson("/api/between?a=Microsoft&b=Student%20Tribe");
      state.rows = data.rows || [];
      state.cypher = data.cypher || "";
      state.ms = data.ms;
      state.lit = new Set([...(data.lit.stations || []), ...(data.lit.companies || [])]);
    } else {
      const q = new URLSearchParams({
        from: state.from,
        skill: state.skill,
        maxHops: String(state.maxHops),
      });
      const data = await getJson("/api/reachable?" + q);
      state.rows = data.rows || [];
      state.cypher = data.cypher || "";
      state.ms = data.ms;
      state.lit = new Set(["station:" + state.from].concat(data.lit.stations || []).concat(data.lit.companies || []));
    }
    state.live = true;
    if (status) status.textContent = state.ms != null ? state.ms + " ms · CognoDB" : "CognoDB";
  } catch (err) {
    state.live = false;
    if (status) status.textContent = "offline";
    state.rows = [];
    state.cypher = err.body && err.body.detail ? err.body.detail : err.message;
  }
  paintChrome();
  draw();
}

function paintChrome() {
  const cy = document.getElementById("cypher");
  if (cy) cy.textContent = state.cypher || "// run a query";
  const live = document.getElementById("livedot");
  if (live) live.classList.toggle("off", !state.live);
  const insp = document.getElementById("inspector");
  if (!insp) return;
  insp.innerHTML = "";
  insp.append(el("h2", {}, ["Inspector"]));

  if (state.detail) {
    insp.append(el("p", {}, [el("b", {}, [state.detail.name])]));
    if (state.detail.kind === "station") {
      insp.append(el("p", { class: "empty" }, [(state.detail.lines || []).join(" · ") || "station"]));
    }
    if (state.detail.industry) {
      insp.append(el("p", { class: "empty" }, [state.detail.industry + " · " + (state.detail.walkMin || "?") + " min walk"]));
    }
    if (state.detail.roles) {
      const ul = el("ul", { class: "jobs" }, []);
      for (const r of state.detail.roles) {
        ul.append(
          el("li", {}, [
            el("b", {}, [r.title]),
            el("small", {}, [r.kind + (r.stipend != null ? " · ₹" + r.stipend : "") + " · " + (r.skills || []).join(", ")]),
          ])
        );
      }
      insp.append(ul);
    }
  } else if (state.rows.length) {
    const ul = el("ul", { class: "jobs" }, []);
    for (const r of state.rows) {
      ul.append(
        el("li", {}, [
          el("b", {}, [r.company ? r.company + " — " + r.title : (r.stations || []).join(" → ")]),
          el("small", {}, [
            r.company
              ? r.hops + " hops · " + r.station + " · " + r.walkMin + " min walk" + (r.stipend != null ? " · ₹" + r.stipend : "")
              : r.hops + " hops · " + r.fromStation + " → " + r.toStation,
          ]),
        ])
      );
    }
    insp.append(ul);
  } else {
    insp.append(el("p", { class: "empty" }, ["Click a square (company) or run Reachable jobs."]));
  }
}

function renderShell() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.append(
    el("header", {}, [
      el("div", { class: "mark" }, []),
      el("h1", {}, ["Interchange", el("span", {}, ["Hyderabad Metro × CognoDB"])]),
      el("div", { class: "live" }, [
        el("span", { class: "dot off", id: "livedot" }, []),
        el("span", { id: "status" }, ["connecting"]),
      ]),
    ]),
    el("div", { class: "shell" }, [
      el("aside", {}, [
        el("h2", {}, ["Queries"]),
        el(
          "div",
          { class: "chips", id: "chips" },
          QUERIES.map((q) =>
            el(
              "button",
              {
                class: "chip" + (state.query === q.id ? " on" : ""),
                type: "button",
                on: {
                  click: () => {
                    state.query = q.id;
                    renderShell();
                    runQuery();
                  },
                },
              },
              [q.label]
            )
          )
        ),
        el("label", { class: "field" }, [
          "From station",
          el(
            "select",
            {
              id: "from",
              on: {
                change: (e) => {
                  state.from = e.target.value;
                  runQuery();
                },
              },
            },
            []
          ),
        ]),
        el("label", { class: "field" }, [
          "Skill",
          el(
            "select",
            {
              id: "skill",
              on: {
                change: (e) => {
                  state.skill = e.target.value;
                  runQuery();
                },
              },
            },
            []
          ),
        ]),
        el("label", { class: "field" }, [
          "Max hops: " + state.maxHops,
          el("input", {
            type: "range",
            min: "0",
            max: "8",
            value: String(state.maxHops),
            on: {
              input: (e) => {
                state.maxHops = Number(e.target.value);
                e.target.parentNode.firstChild.nodeValue = "Max hops: " + state.maxHops;
              },
              change: () => runQuery(),
            },
          }),
        ]),
        el("h2", {}, ["Cypher"]),
        el("pre", { class: "cypher", id: "cypher" }, [state.cypher || "// loading"]),
        el("div", { class: "why" }, [
          "A commute is a variable-length walk. SQL would invent a recursive CTE and then join companies. Here it is one path: (Station)-[:NEXT*0..k]-(Station)←[:NEAR]-(Company)-[:OFFERS]->(Role)-[:REQUIRES]->(Skill).",
        ]),
      ]),
      el("div", { class: "stage" }, [
        el("div", { class: "legend" }, [
          el("span", {}, [el("i", { class: "swatch", style: { background: LINES.Red } }, []), "Red"]),
          el("span", {}, [el("i", { class: "swatch", style: { background: LINES.Blue } }, []), "Blue"]),
          el("span", {}, [el("i", { class: "swatch", style: { background: LINES.Green } }, []), "Green"]),
          el("span", {}, [el("i", { class: "swatch", style: { background: "#9b7dff", borderRadius: "2px" } }, []), "Company"]),
        ]),
        svgEl("svg", { id: "map" }),
        el("div", { class: "hint" }, ["Phase I schematic · click a company to expand roles"]),
      ]),
      el("div", { class: "inspector", id: "inspector" }, [el("h2", {}, ["Inspector"])]),
    ])
  );

  const from = document.getElementById("from");
  const skill = document.getElementById("skill");
  if (state.graph && from) {
    const names = state.graph.nodes.filter((n) => n.kind === "station").map((n) => n.name);
    for (const name of names) {
      const opt = el("option", { value: name }, [name]);
      if (name === state.from) opt.selected = true;
      from.append(opt);
    }
  }
  if (skill) {
    const skills = ["Graphs", "Python", "TypeScript", "React", "Node.js", "Java", "SQL", "Testing"];
    for (const s of skills) {
      const opt = el("option", { value: s }, [s]);
      if (s === state.skill) opt.selected = true;
      skill.append(opt);
    }
  }
  paintChrome();
  requestAnimationFrame(draw);
}

async function boot() {
  renderShell();
  try {
    const graph = await getJson("/api/graph");
    state.graph = graph;
    state.cypher = graph.cypher;
    state.ms = graph.ms;
    state.live = true;
    renderShell();
    await runQuery();
  } catch (err) {
    state.live = false;
    state.cypher = err.message;
    paintChrome();
    const status = document.getElementById("status");
    if (status) status.textContent = "offline";
  }
  window.addEventListener("resize", draw);
}

boot();
