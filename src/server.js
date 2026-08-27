import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDriver, verify } from "./db.js";
import {
  betweenCompanies,
  listCompanies,
  listSkills,
  listStations,
  neighborhood,
  reachable,
} from "./queries.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res).catch(next);
}

function dbUnavailable(err) {
  return (
    err.code === "CONFIG" ||
    err.code === "ServiceUnavailable" ||
    err.name === "Neo4jError" ||
    /ECONNREFUSED|ENOTFOUND|authentication/i.test(String(err.message))
  );
}

app.get(
  "/api/health",
  asyncRoute(async (_req, res) => {
    await verify();
    res.json({ ok: true, database: "cognodb" });
  })
);

app.get(
  "/api/stations",
  asyncRoute(async (_req, res) => {
    res.json(await listStations());
  })
);

app.get(
  "/api/skills",
  asyncRoute(async (_req, res) => {
    res.json(await listSkills());
  })
);

app.get(
  "/api/companies",
  asyncRoute(async (_req, res) => {
    res.json(await listCompanies());
  })
);

app.get(
  "/api/reachable",
  asyncRoute(async (req, res) => {
    const from = String(req.query.from || "").trim();
    const skill = String(req.query.skill || "").trim();
    const maxHops = Number(req.query.maxHops || 5);
    if (!from || !skill) {
      res.status(400).json({ error: "from and skill are required" });
      return;
    }
    res.json(await reachable({ from, skill, maxHops }));
  })
);

app.get(
  "/api/between",
  asyncRoute(async (req, res) => {
    const a = String(req.query.a || "").trim();
    const b = String(req.query.b || "").trim();
    if (!a || !b) {
      res.status(400).json({ error: "a and b company names are required" });
      return;
    }
    res.json(await betweenCompanies({ a, b }));
  })
);

app.get(
  "/api/station/:name",
  asyncRoute(async (req, res) => {
    const row = await neighborhood({ station: req.params.name });
    if (!row) {
      res.status(404).json({ error: "Station not found" });
      return;
    }
    res.json(row);
  })
);

app.use((err, _req, res, _next) => {
  if (dbUnavailable(err)) {
    res.status(503).json({
      error: "Graph database unreachable. Check COGNODB_URI and COGNODB_PASSWORD.",
      detail: err.message,
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

const server = app.listen(port, () => {
  console.log(`Interchange on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await closeDriver();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
