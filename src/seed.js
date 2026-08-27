import "dotenv/config";
import { companies, lines, segments, stations } from "../data/graph.js";
import { closeDriver, runWrite, verify } from "./db.js";

async function seed() {
  await verify();

  await runWrite(`MATCH (n) DETACH DELETE n`);

  for (const line of lines) {
    await runWrite(`MERGE (l:Line {name: $name}) SET l.color = $color`, line);
  }

  for (const station of stations) {
    await runWrite(`MERGE (s:Station {name: $name})`, { name: station.name });
    for (const lineName of station.lines) {
      await runWrite(
        `MATCH (s:Station {name: $station})
         MATCH (l:Line {name: $line})
         MERGE (s)-[:ON_LINE]->(l)`,
        { station: station.name, line: lineName }
      );
    }
  }

  for (const [lineName, ...edges] of segments) {
    for (const [from, to, minutes] of edges) {
      await runWrite(
        `MATCH (a:Station {name: $from})
         MATCH (b:Station {name: $to})
         MERGE (a)-[ab:NEXT {line: $line}]->(b)
         SET ab.minutes = $minutes
         MERGE (b)-[ba:NEXT {line: $line}]->(a)
         SET ba.minutes = $minutes`,
        { from, to, minutes, line: lineName }
      );
    }
  }

  for (const company of companies) {
    await runWrite(
      `MATCH (s:Station {name: $station})
       MERGE (c:Company {name: $name})
       SET c.industry = $industry
       MERGE (c)-[n:NEAR]->(s)
       SET n.walkMin = $walkMin`,
      {
        name: company.name,
        industry: company.industry,
        station: company.station,
        walkMin: company.walkMin,
      }
    );

    for (const role of company.roles) {
      await runWrite(
        `MATCH (c:Company {name: $company})
         MERGE (r:Role {title: $title, company: $company})
         SET r.kind = $kind, r.stipend = $stipend
         MERGE (c)-[:OFFERS]->(r)`,
        {
          company: company.name,
          title: role.title,
          kind: role.kind,
          stipend: role.stipend,
        }
      );
      for (const skill of role.skills) {
        await runWrite(
          `MATCH (r:Role {title: $title, company: $company})
           MERGE (sk:Skill {name: $skill})
           MERGE (r)-[:REQUIRES]->(sk)`,
          { title: role.title, company: company.name, skill }
        );
      }
    }
  }

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
