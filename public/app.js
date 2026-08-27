const LINES = { Red: "#e31e24", Blue: "#0078c8", Green: "#00a651" };

/* Positions match L&T official Network Map (HMRRouteMap_new.pdf), percent of canvas. */
const XY = {
  Miyapur: [20, 10],
  "JNTU College": [25, 15],
  "KPHB Colony": [29, 19],
  Kukatpally: [33, 23],
  Balanagar: [36, 27],
  Moosapet: [40, 31],
  "Bharat Nagar": [43, 35],
  Erragadda: [46, 39],
  "ESI Hospital": [48, 43],
  "S.R. Nagar": [49, 46],
  Ameerpet: [48, 49],
  Punjagutta: [49, 55],
  "Irrum Manzil": [51, 60],
  Khairatabad: [54, 65],
  "Lakdi-ka-pul": [57, 70],
  Assembly: [60, 74],
  Nampally: [63, 78],
  "Gandhi Bhavan": [65, 82],
  "Osmania Medical College": [66, 85],
  "MG Bus Station": [68, 88],
  Malakpet: [74, 88],
  "New Market": [79, 88],
  Musarambagh: [84, 88],
  Dilsukhnagar: [88, 88],
  Chaitanyapuri: [91, 90],
  "Victoria Memorial": [94, 93],
  "LB Nagar": [96, 96],
  Raidurg: [8, 38],
  "HITEC City": [14, 42],
  "Durgam Cheruvu": [19, 45],
  Madhapur: [24, 47],
  "Peddamma Gudi": [29, 48],
  "Jubilee Hills Check Post": [34, 48],
  "Road No 5 Jubilee Hills": [38, 48],
  Yusufguda: [42, 48],
  "Madhura Nagar": [45, 48],
  Begumpet: [53, 48],
  "Prakash Nagar": [57, 48],
  Rasoolpura: [61, 48],
  Paradise: [64, 48],
  "Parade Ground": [68, 48],
  "Secunderabad East": [73, 48],
  Mettuguda: [77, 48],
  Tarnaka: [81, 48],
  Habsiguda: [86, 52],
  NGRI: [89, 56],
  Stadium: [91, 60],
  Uppal: [93, 64],
  Nagole: [95, 68],
  "JBS Parade Ground": [68, 41],
  "Secunderabad West": [68, 54],
  "Gandhi Hospital": [68, 60],
  Musheerabad: [68, 66],
  "RTC X Roads": [68, 72],
  Chikkadpally: [68, 76],
  Narayanaguda: [68, 80],
  "Sultan Bazaar": [68, 84],
};

const RED = ["Miyapur","JNTU College","KPHB Colony","Kukatpally","Balanagar","Moosapet","Bharat Nagar","Erragadda","ESI Hospital","S.R. Nagar","Ameerpet","Punjagutta","Irrum Manzil","Khairatabad","Lakdi-ka-pul","Assembly","Nampally","Gandhi Bhavan","Osmania Medical College","MG Bus Station","Malakpet","New Market","Musarambagh","Dilsukhnagar","Chaitanyapuri","Victoria Memorial","LB Nagar"];
const BLUE = ["Raidurg","HITEC City","Durgam Cheruvu","Madhapur","Peddamma Gudi","Jubilee Hills Check Post","Road No 5 Jubilee Hills","Yusufguda","Madhura Nagar","Ameerpet","Begumpet","Prakash Nagar","Rasoolpura","Paradise","Parade Ground","Secunderabad East","Mettuguda","Tarnaka","Habsiguda","NGRI","Stadium","Uppal","Nagole"];
const GREEN = ["JBS Parade Ground","Parade Ground","Secunderabad West","Gandhi Hospital","Musheerabad","RTC X Roads","Chikkadpally","Narayanaguda","Sultan Bazaar","MG Bus Station"];

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
    } else if (k === "style" && typeof attrs[k] === "object") {
      Object.assign(n.style, attrs[k]);
    } else if (attrs[k] === true) n.setAttribute(k, "");
    else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
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

function pt(name, w, h) {
  const p = XY[name];
  if (!p) return { x: w / 2, y: h / 2 };
  return { x: (p[0] / 100) * w, y: (p[1] / 100) * h };
}

function poly(names, w, h) {
  return names.map((n) => {
    const p = pt(n, w, h);
    return p.x + "," + p.y;
  }).join(" ");
}

function colorFor(node) {
  if (node.kind === "company") return "#6d4aff";
  if (node.lines && node.lines[0]) return LINES[node.lines[0]] || "#888";
  return "#888";
}

function isLit(id) {
  if (!state.lit.size) return true;
  return state.lit.has(id);
}

function layout(graph, w, h) {
  const used = {};
  for (const node of graph.nodes) {
    if (node.kind === "station") {
      const p = pt(node.name, w, h);
      node.x = p.x;
      node.y = p.y;
    } else {
      const home = pt(node.station, w, h);
      const n = used[node.station] || 0;
      used[node.station] = n + 1;
      const ang = -1.1 + n * 0.7;
      node.x = home.x + Math.cos(ang) * 28;
      node.y = home.y - 22 - n * 14;
    }
  }
}

function draw() {
  const svg = document.getElementById("map");
  if (!svg || !state.graph) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const w = svg.clientWidth || 1100;
  const h = svg.clientHeight || 780;
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  layout(state.graph, w, h);

  const bg = svgEl("rect", { x: 0, y: 0, width: w, height: h, fill: "#ffffff" });
  svg.append(bg);

  function stroke(names, color) {
    svg.append(svgEl("polyline", {
      points: poly(names, w, h),
      fill: "none",
      stroke: color,
      "stroke-width": Math.max(10, w / 90),
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }));
  }
  stroke(RED, LINES.Red);
  stroke(BLUE, LINES.Blue);
  stroke(GREEN, LINES.Green);

  const byId = Object.fromEntries(state.graph.nodes.map((n) => [n.id, n]));
  for (const e of state.graph.edges) {
    if (e.kind !== "NEAR") continue;
    const a = byId[e.source];
    const b = byId[e.target];
    if (!a || !b) continue;
    const lit = isLit(e.source) && isLit(e.target);
    svg.append(svgEl("line", {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: "#6d4aff",
      "stroke-width": 1.4,
      "stroke-dasharray": "3 4",
      "stroke-opacity": lit ? 0.85 : 0.15,
    }));
  }

  for (const node of state.graph.nodes) {
    const g = svgEl("g", { style: "cursor:pointer" });
    const lit = isLit(node.id);
    const selected = state.selected && state.selected.id === node.id;
    if (node.kind === "company") {
      g.append(svgEl("rect", {
        x: node.x - 7, y: node.y - 7, width: 14, height: 14, rx: 3,
        fill: colorFor(node),
        opacity: lit ? 1 : 0.2,
        stroke: selected ? "#102033" : "none",
        "stroke-width": 2,
      }));
      const t = svgEl("text", {
        x: node.x + 10, y: node.y + 4, fill: lit ? "#102033" : "#9aa7b8",
        "font-size": 11, "font-family": "IBM Plex Sans, system-ui, sans-serif", "font-weight": 600,
      });
      t.textContent = node.name;
      g.append(t);
    } else {
      const inter = node.lines && node.lines.length > 1;
      const r = inter ? 9 : 7;
      if (inter) {
        g.append(svgEl("circle", {
          cx: node.x, cy: node.y, r: r + 4, fill: "#fff",
          stroke: "#102033", "stroke-width": 2.2, opacity: lit ? 1 : 0.25,
        }));
      }
      g.append(svgEl("circle", {
        cx: node.x, cy: node.y, r: r,
        fill: "#fff",
        stroke: colorFor(node),
        "stroke-width": inter ? 4 : 3.2,
        opacity: lit ? 1 : 0.2,
      }));
      const show =
        inter ||
        node.name === state.from ||
        node.name === "Miyapur" ||
        node.name === "Raidurg" ||
        node.name === "Nagole" ||
        node.name === "LB Nagar" ||
        node.name === "HITEC City" ||
        node.name === "JBS Parade Ground" ||
        (state.lit.size && lit);
      if (show) {
        const t = svgEl("text", {
          x: node.x + 12, y: node.y - 8, fill: lit ? "#102033" : "#8a96a8",
          "font-size": 10, "font-family": "IBM Plex Sans, system-ui, sans-serif", "font-weight": 600,
        });
        t.textContent = node.name;
        g.append(t);
      }
    }
    g.addEventListener("click", () => selectNode(node));
    svg.append(g);
  }
}

async function selectNode(node) {
  state.selected = node;
  state.detail = node;
  if (node.kind === "company") {
    try {
      const data = await getJson("/api/expand?name=" + encodeURIComponent(node.name));
      state.detail = Object.assign({}, node, { roles: data.roles, cypher: data.cypher, ms: data.ms });
      if (data.cypher) state.cypher = data.cypher;
    } catch (err) {
      state.detail = Object.assign({}, node, { error: err.message });
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
      state.lit = new Set([].concat(data.lit.stations || [], data.lit.companies || []));
    } else {
      const q = new URLSearchParams({ from: state.from, skill: state.skill, maxHops: String(state.maxHops) });
      const data = await getJson("/api/reachable?" + q);
      state.rows = data.rows || [];
      state.cypher = data.cypher || "";
      state.ms = data.ms;
      state.lit = new Set(["station:" + state.from].concat(data.lit.stations || [], data.lit.companies || []));
    }
    state.live = true;
    if (status) status.textContent = state.ms != null ? state.ms + " ms · CognoDB" : "CognoDB";
  } catch (err) {
    state.live = false;
    if (status) status.textContent = "map only";
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
    if (state.detail.lines) insp.append(el("p", { class: "empty" }, [state.detail.lines.join(" · ")]));
    if (state.detail.industry) insp.append(el("p", { class: "empty" }, [state.detail.industry + " · " + (state.detail.walkMin || "?") + " min walk"]));
    if (state.detail.roles) {
      const ul = el("ul", { class: "jobs" }, []);
      for (const r of state.detail.roles) {
        ul.append(el("li", {}, [
          el("b", {}, [r.title]),
          el("small", {}, [r.kind + (r.stipend != null ? " · ₹" + r.stipend : "") + " · " + (r.skills || []).join(", ")]),
        ]));
      }
      insp.append(ul);
    }
  } else if (state.rows.length) {
    const ul = el("ul", { class: "jobs" }, []);
    for (const r of state.rows) {
      ul.append(el("li", {}, [
        el("b", {}, [r.company ? r.company + " — " + r.title : (r.stations || []).join(" → ")]),
        el("small", {}, [r.company ? r.hops + " hops · " + r.station : r.hops + " hops"]),
      ]));
    }
    insp.append(ul);
  } else {
    insp.append(el("p", { class: "empty" }, ["Official HMR Phase I. Click a purple square (company)."]));
  }
}

function renderShell() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.append(
    el("header", {}, [
      el("div", { class: "mark" }, []),
      el("h1", {}, ["Interchange", el("span", {}, ["Official Hyderabad Metro Network Map × CognoDB"])]),
      el("div", { class: "live" }, [
        el("span", { class: "dot off", id: "livedot" }, []),
        el("span", { id: "status" }, ["connecting"]),
      ]),
    ]),
    el("div", { class: "shell" }, [
      el("aside", {}, [
        el("h2", {}, ["Queries"]),
        el("div", { class: "chips" }, QUERIES.map((q) => el("button", {
          class: "chip" + (state.query === q.id ? " on" : ""),
          type: "button",
          on: { click: () => { state.query = q.id; renderShell(); runQuery(); } },
        }, [q.label]))),
        el("label", { class: "field" }, ["From station", el("select", {
          id: "from",
          on: { change: (e) => { state.from = e.target.value; runQuery(); } },
        }, [])]),
        el("label", { class: "field" }, ["Skill", el("select", {
          id: "skill",
          on: { change: (e) => { state.skill = e.target.value; runQuery(); } },
        }, [])]),
        el("label", { class: "field" }, ["Max hops: " + state.maxHops, el("input", {
          type: "range", min: "0", max: "8", value: String(state.maxHops),
          on: {
            input: (e) => {
              state.maxHops = Number(e.target.value);
              e.target.parentNode.firstChild.nodeValue = "Max hops: " + state.maxHops;
            },
            change: () => runQuery(),
          },
        })]),
        el("h2", {}, ["Cypher"]),
        el("pre", { class: "cypher", id: "cypher" }, [state.cypher || "// loading"]),
        el("div", { class: "why" }, [
          "Wexa wants a graph you can see. The commute is (Station)-[:NEXT*]-(Station)←[:NEAR]-(Company)-[:OFFERS]->(Role)-[:REQUIRES]->(Skill). The map is L&T Hyderabad Metro Phase I.",
        ]),
      ]),
      el("div", { class: "stage" }, [
        el("div", { class: "stage-card" }, [svgEl("svg", { id: "map" })]),
      ]),
      el("div", { class: "inspector", id: "inspector" }, [el("h2", {}, ["Inspector"])]),
    ])
  );
  const from = document.getElementById("from");
  const skill = document.getElementById("skill");
  if (state.graph && from) {
    for (const name of state.graph.nodes.filter((n) => n.kind === "station").map((n) => n.name)) {
      const opt = el("option", { value: name }, [name]);
      if (name === state.from) opt.selected = true;
      from.append(opt);
    }
  }
  if (skill) {
    for (const s of ["Graphs", "Python", "TypeScript", "React", "Node.js", "Java", "SQL", "Testing"]) {
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
    state.live = !graph.fallback;
    renderShell();
    await runQuery();
  } catch (err) {
    state.live = false;
    state.cypher = err.message;
    paintChrome();
  }
  window.addEventListener("resize", draw);
}

boot();
