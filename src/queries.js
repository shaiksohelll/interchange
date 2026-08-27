import neo4j from "neo4j-driver";
import { runRead, toNumber } from "./db.js";
import { orders } from "../data/graph.js";

const MAX_HOPS_CAP = 8;

export const CYPHER = {
  city: `MATCH (s:Station)
OPTIONAL MATCH (s)-[:ON_LINE]->(l:Line)
OPTIONAL MATCH (c:Company)-[near:NEAR]->(s)
RETURN s.name AS name,
       collect(DISTINCT {name: l.name, color: l.color}) AS lines,
       collect(DISTINCT {name: c.name, industry: c.industry, walkMin: near.walkMin}) AS companies`,
  next: `MATCH (a:Station)-[n:NEXT]->(b:Station)
RETURN a.name AS source, b.name AS target, n.line AS line, n.minutes AS minutes`,
  reachable: `MATCH (start:Station {name: $from})-[rels:NEXT*0..8]-(dest:Station)
WITH dest, min(size(rels)) AS hops
WHERE hops <= $maxHops
MATCH (c:Company)-[near:NEAR]->(dest)
MATCH (c)-[:OFFERS]->(r:Role)-[:REQUIRES]->(sk:Skill {name: $skill})
RETURN dest.name AS station,
       hops,
       c.name AS company,
       c.industry AS industry,
       near.walkMin AS walkMin,
       r.title AS title,
       r.kind AS kind,
       r.stipend AS stipend
ORDER BY hops, walkMin, company`,
  between: `MATCH (ca:Company {name: $a})-[:NEAR]->(sa:Station)
MATCH (cb:Company {name: $b})-[:NEAR]->(sb:Station)
MATCH p = (sa)-[:NEXT*0..20]-(sb)
WITH sa, sb, p, size(relationships(p)) AS hops
ORDER BY hops
LIMIT 1
RETURN sa.name AS fromStation,
       sb.name AS toStation,
       hops,
       [n IN nodes(p) | n.name] AS stations`,
  expandCompany: `MATCH (c:Company {name: $name})-[:OFFERS]->(r:Role)
OPTIONAL MATCH (r)-[:REQUIRES]->(sk:Skill)
RETURN r.title AS title, r.kind AS kind, r.stipend AS stipend,
       collect(sk.name) AS skills`,
  counts: `MATCH (n)
RETURN labels(n)[0] AS label, count(*) AS n
ORDER BY label`,
};

export async function listStations() {
  const records = await runRead(
    `MATCH (s:Station)-[:ON_LINE]->(l:Line)
     RETURN s.name AS name, collect(l.name) AS lines
     ORDER BY s.name`
  );
  return records.map((r) => ({
    name: r.get("name"),
    lines: r.get("lines"),
  }));
}

export async function listSkills() {
  const records = await runRead(`MATCH (sk:Skill) RETURN sk.name AS name ORDER BY sk.name`);
  return records.map((r) => r.get("name"));
}

export async function listCompanies() {
  const records = await runRead(`MATCH (c:Company) RETURN c.name AS name ORDER BY c.name`);
  return records.map((r) => r.get("name"));
}

export async function counts() {
  const records = await runRead(CYPHER.counts);
  return Object.fromEntries(records.map((r) => [r.get("label"), toNumber(r.get("n"))]));
}

export async function cityGraph() {
  const [stationRows, nextRows, tally] = await Promise.all([
    runRead(CYPHER.city),
    runRead(CYPHER.next),
    counts(),
  ]);

  const nodes = [];
  const seen = new Set();

  for (const r of stationRows) {
    const name = r.get("name");
    const stationLines = r.get("lines").filter((l) => l && l.name);
    nodes.push({
      id: `station:${name}`,
      name,
      kind: "station",
      lines: stationLines.map((l) => l.name),
      colors: stationLines.map((l) => l.color),
    });
    seen.add(`station:${name}`);
    for (const c of r.get("companies")) {
      if (!c || !c.name) continue;
      const id = `company:${c.name}`;
      if (seen.has(id)) continue;
      seen.add(id);
      nodes.push({
        id,
        name: c.name,
        kind: "company",
        industry: c.industry,
        walkMin: toNumber(c.walkMin),
        station: name,
      });
    }
  }

  const edges = [];
  const edgeSeen = new Set();
  for (const r of nextRows) {
    const source = r.get("source");
    const target = r.get("target");
    const line = r.get("line");
    const key = [source, target].sort().join("|") + "|" + line;
    if (edgeSeen.has(key)) continue;
    edgeSeen.add(key);
    edges.push({
      id: `next:${key}`,
      source: `station:${source}`,
      target: `station:${target}`,
      kind: "NEXT",
      line,
      minutes: toNumber(r.get("minutes")),
    });
  }

  for (const r of stationRows) {
    const station = r.get("name");
    for (const c of r.get("companies")) {
      if (!c || !c.name) continue;
      edges.push({
        id: `near:${c.name}:${station}`,
        source: `company:${c.name}`,
        target: `station:${station}`,
        kind: "NEAR",
        walkMin: toNumber(c.walkMin),
      });
    }
  }

  return { nodes, edges, orders, counts: tally, cypher: CYPHER.city };
}

export async function reachable({ from, skill, maxHops = 5 }) {
  const hops = Math.max(0, Math.min(MAX_HOPS_CAP, Number(maxHops) || 5));
  const records = await runRead(CYPHER.reachable, {
    from,
    skill,
    maxHops: neo4j.int(hops),
  });

  const rows = records.map((r) => ({
    station: r.get("station"),
    hops: toNumber(r.get("hops")),
    company: r.get("company"),
    industry: r.get("industry"),
    walkMin: toNumber(r.get("walkMin")),
    title: r.get("title"),
    kind: r.get("kind"),
    stipend: r.get("stipend") == null ? null : toNumber(r.get("stipend")),
  }));

  return {
    rows,
    lit: {
      stations: [...new Set(rows.map((x) => `station:${x.station}`))],
      companies: [...new Set(rows.map((x) => `company:${x.company}`))],
    },
    cypher: CYPHER.reachable,
    params: { from, skill, maxHops: hops },
  };
}

export async function betweenCompanies({ a, b }) {
  const records = await runRead(CYPHER.between, { a, b });
  const rows = records.map((r) => ({
    fromStation: r.get("fromStation"),
    toStation: r.get("toStation"),
    hops: toNumber(r.get("hops")),
    stations: r.get("stations"),
  }));
  const stations = [...new Set(rows.flatMap((x) => x.stations || []))];
  return {
    rows,
    lit: {
      stations: stations.map((name) => `station:${name}`),
      companies: [`company:${a}`, `company:${b}`],
    },
    cypher: CYPHER.between,
    params: { a, b },
  };
}

export async function neighborhood({ station }) {
  const records = await runRead(
    `MATCH (s:Station {name: $station})
     OPTIONAL MATCH (s)-[n:NEXT]->(other:Station)
     OPTIONAL MATCH (c:Company)-[near:NEAR]->(s)
     RETURN s.name AS name,
            collect(DISTINCT {to: other.name, minutes: n.minutes, line: n.line}) AS next,
            collect(DISTINCT {company: c.name, walkMin: near.walkMin}) AS companies`,
    { station }
  );
  if (!records.length) return null;
  const r = records[0];
  return {
    name: r.get("name"),
    next: r.get("next").filter((x) => x.to),
    companies: r.get("companies").filter((x) => x.company),
  };
}

export async function expandCompany({ name }) {
  const records = await runRead(CYPHER.expandCompany, { name });
  return {
    name,
    roles: records.map((r) => ({
      title: r.get("title"),
      kind: r.get("kind"),
      stipend: r.get("stipend") == null ? null : toNumber(r.get("stipend")),
      skills: r.get("skills").filter(Boolean),
    })),
    cypher: CYPHER.expandCompany,
  };
}
