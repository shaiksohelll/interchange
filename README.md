# Interchange

Hyderabad Metro as a CognoDB graph, with internships hanging off stations you can actually walk to.

This is not a route planner with a jobs table glued on. The commute **is** the query: a variable-length walk on `:NEXT`, then `:NEAR` companies, `:OFFERS` roles, `:REQUIRES` skills.

```
(Station)-[:ON_LINE]->(Line)
(Station)-[:NEXT {minutes, line}]->(Station)
(Company)-[:NEAR {walkMin}]->(Station)
(Company)-[:OFFERS]->(Role)-[:REQUIRES]->(Skill)
```

The UI is a live schematic of Phase I (Red / Blue / Green). Query chips run Cypher against CognoDB and light up the matching subgraph. Click a company to expand roles.

## Why a graph

"Jobs within 4 metro hops of HITEC City that need Graphs" is one pattern:

```cypher
MATCH (start:Station {name: $from})
MATCH (start)-[:NEXT*0..8]-(dest:Station)
WITH dest, min(length(shortestPath((start)-[:NEXT*]-(dest)))) AS hops
WHERE hops <= $maxHops
MATCH (c:Company)-[:NEAR]->(dest)
MATCH (c)-[:OFFERS]->(r:Role)-[:REQUIRES]->(:Skill {name: $skill})
RETURN dest, hops, c, r
```

The same question in SQL is a recursive CTE for the metro, then a pile of joins. That is the point of the assignment.

## Data

- Phase I station names (HITEC City, JBS Parade Ground, RTC X Roads, Ameerpet, MG Bus Station, …)
- Offices pinned from public addresses: Qualcomm at Raidurg, Amazon at Durgam Cheruvu, Deloitte at Madhapur, Google / Wexa AI at HITEC City, Student Tribe at Punjagutta
- Walk minutes are estimates, not official HR data

## Run

1. Create a CognoDB instance at [console.cognodb.com](https://console.cognodb.com)
2. Copy `.env.example` → `.env` and fill `COGNODB_URI` / `COGNODB_PASSWORD`
3. `npm install`
4. `npm run seed`
5. `npm start` → [http://localhost:3000](http://localhost:3000)

Do not commit `.env`. If CognoDB is down, `/api/graph` still serves the Phase I schematic from seed data so the map loads; Reachable / corridor queries need a live instance.

## Demo path for reviewers

1. Leave **From** on `HITEC City`, skill `Graphs`, hops `4` — Wexa AI and Swecha light up
2. Switch skill to `Python` — Qualcomm, Microsoft, Cyient, Swecha
3. Run **Company corridor** — shortest metro walk Microsoft → Student Tribe (Raidurg → Punjagutta via Ameerpet)
4. Click Qualcomm to expand the intern role

## Stack

Express + `neo4j-driver` (Bolt) + vanilla JS/SVG. No React. Seed is UNWIND batches so c0 stays happy.
