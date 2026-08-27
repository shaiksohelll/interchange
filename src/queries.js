import neo4j from "neo4j-driver";
import { runRead, toNumber } from "./db.js";

const MAX_HOPS_CAP = 8;

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

/**
 * Variable-length metro walk, then companies hanging off the destination.
 * Hop bound is a fixed 0..8 in the pattern (Cypher cannot parameterize *min..max);
 * $maxHops filters after. This is the query a recursive SQL CTE would have to invent.
 */
export async function reachable({ from, skill, maxHops = 5 }) {
  const hops = Math.max(0, Math.min(MAX_HOPS_CAP, Number(maxHops) || 5));
  const records = await runRead(
    `MATCH (start:Station {name: $from})
     MATCH (start)-[:NEXT*0..8]-(dest:Station)
     WITH start, dest, min(length(shortestPath((start)-[:NEXT*]-(dest)))) AS hops
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
    { from, skill, maxHops: neo4j.int(hops) }
  );

  return records.map((r) => ({
    station: r.get("station"),
    hops: toNumber(r.get("hops")),
    company: r.get("company"),
    industry: r.get("industry"),
    walkMin: toNumber(r.get("walkMin")),
    title: r.get("title"),
    kind: r.get("kind"),
    stipend: r.get("stipend") == null ? null : toNumber(r.get("stipend")),
  }));
}

/** shortestPath between two companies' nearest stations — awkward as a join soup. */
export async function betweenCompanies({ a, b }) {
  const records = await runRead(
    `MATCH (ca:Company {name: $a})-[:NEAR]->(sa:Station)
     MATCH (cb:Company {name: $b})-[:NEAR]->(sb:Station)
     MATCH path = shortestPath((sa)-[:NEXT*]-(sb))
     RETURN sa.name AS fromStation,
            sb.name AS toStation,
            length(path) AS hops,
            [n IN nodes(path) | n.name] AS stations`,
    { a, b }
  );

  return records.map((r) => ({
    fromStation: r.get("fromStation"),
    toStation: r.get("toStation"),
    hops: toNumber(r.get("hops")),
    stations: r.get("stations"),
  }));
}

export async function listCompanies() {
  const records = await runRead(`MATCH (c:Company) RETURN c.name AS name ORDER BY c.name`);
  return records.map((r) => r.get("name"));
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
