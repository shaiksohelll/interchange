import { companies, lines, orders, segments, stations } from "../data/graph.js";

export function localCityGraph() {
  const color = Object.fromEntries(lines.map((l) => [l.name, l.color]));
  const nodes = stations.map((s) => ({
    id: `station:${s.name}`,
    name: s.name,
    kind: "station",
    lines: s.lines,
    colors: s.lines.map((n) => color[n]),
  }));

  const seen = new Set();
  for (const c of companies) {
    const id = `company:${c.name}`;
    if (seen.has(id)) continue;
    seen.add(id);
    nodes.push({
      id,
      name: c.name,
      kind: "company",
      industry: c.industry,
      walkMin: c.walkMin,
      station: c.station,
    });
  }

  const edges = [];
  const edgeSeen = new Set();
  for (const [lineName, ...rows] of segments) {
    for (const [from, to, minutes] of rows) {
      const key = [from, to].sort().join("|") + "|" + lineName;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      edges.push({
        id: `next:${key}`,
        source: `station:${from}`,
        target: `station:${to}`,
        kind: "NEXT",
        line: lineName,
        minutes,
      });
    }
  }

  for (const c of companies) {
    edges.push({
      id: `near:${c.name}:${c.station}`,
      source: `company:${c.name}`,
      target: `station:${c.station}`,
      kind: "NEAR",
      walkMin: c.walkMin,
    });
  }

  return {
    nodes,
    edges,
    orders,
    counts: {
      Station: stations.length,
      Company: companies.length,
      Line: lines.length,
    },
    cypher: "// CognoDB unreachable — schematic served from seed data",
    fallback: true,
  };
}
