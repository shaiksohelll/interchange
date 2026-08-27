import "dotenv/config";
import { companies, lines, segments, stations } from "../data/graph.js";
import { closeDriver, runWrite, verify } from "./db.js";

function segmentRows() {
  const rows = [];
  for (const [lineName, ...edges] of segments) {
    for (const [from, to, minutes] of edges) {
      rows.push({ from, to, minutes, line: lineName });
    }
  }
  return rows;
}

async function seed() {
  await verify();
  await runWrite(`MATCH (n) DETACH DELETE n`);

  await runWrite(
    `UNWIND $lines AS line
     MERGE (l:Line {name: line.name})
     SET l.color = line.color`,
    { lines }
  );

  await runWrite(
    `UNWIND $stations AS s
     MERGE (st:Station {name: s.name})
     WITH st, s
     UNWIND s.lines AS lineName
     MATCH (l:Line {name: lineName})
     MERGE (st)-[:ON_LINE]->(l)`,
    { stations }
  );

  await runWrite(
    `UNWIND $edges AS e
     MATCH (a:Station {name: e.from})
     MATCH (b:Station {name: e.to})
     MERGE (a)-[ab:NEXT {line: e.line}]->(b)
     SET ab.minutes = e.minutes
     MERGE (b)-[ba:NEXT {line: e.line}]->(a)
     SET ba.minutes = e.minutes`,
    { edges: segmentRows() }
  );

  await runWrite(
    `UNWIND $companies AS co
     MATCH (s:Station {name: co.station})
     MERGE (c:Company {name: co.name})
     SET c.industry = co.industry
     MERGE (c)-[n:NEAR]->(s)
     SET n.walkMin = co.walkMin
     WITH c, co
     UNWIND co.roles AS role
     MERGE (r:Role {title: role.title, company: co.name})
     SET r.kind = role.kind, r.stipend = role.stipend
     MERGE (c)-[:OFFERS]->(r)
     WITH r, role
     UNWIND role.skills AS skillName
     MERGE (sk:Skill {name: skillName})
     MERGE (r)-[:REQUIRES]->(sk)`,
    { companies }
  );

  const counts = await runWrite(
    `MATCH (n) RETURN labels(n)[0] AS label, count(*) AS n ORDER BY label`
  );
  console.log("Seeded:");
  for (const rec of counts) {
    console.log(`  ${rec.get("label")}: ${rec.get("n")}`);
  }
}

seed()
  .then(() => closeDriver())
  .catch(async (err) => {
    console.error(err.message || err);
    await closeDriver();
    process.exit(1);
  });
