import dns from "node:dns/promises";
import neo4j from "neo4j-driver";

function required(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`Missing ${name}. Copy .env.example to .env and fill CognoDB connection details.`);
    err.code = "CONFIG";
    throw err;
  }
  return value.replace(/^\uFEFF/, "").trim().replace(/^["']|["']$/g, "");
}

function hostPort(uri) {
  const rest = uri.replace(/^[a-z0-9+]+:\/\//i, "").split("/")[0];
  const host = rest.split(":")[0];
  const port = rest.includes(":") ? rest.split(":")[1] : "7687";
  return { host, port };
}

function ipv4Resolver(port) {
  return async (address) => {
    const host = String(address).split(":")[0];
    const { address: ip } = await dns.lookup(host, { family: 4 });
    return [`${ip}:${port}`];
  };
}

export function connectionAttempts() {
  let uri = required("COGNODB_URI");
  if (uri.startsWith("bolt+s://")) uri = "bolt+ssc://" + uri.slice("bolt+s://".length);
  if (uri.startsWith("neo4j+s://")) uri = "neo4j+ssc://" + uri.slice("neo4j+s://".length);
  const { host, port } = hostPort(uri);
  return [
    { label: "bolt+ssc", uri: `bolt+ssc://${host}:${port}`, extra: { connectionTimeout: 15000 } },
    {
      label: "bolt+ssc ipv4",
      uri: `bolt+ssc://${host}:${port}`,
      extra: { connectionTimeout: 15000, resolver: ipv4Resolver(port) },
    },
    {
      label: "encrypted trust-all ipv4",
      uri: `bolt://${host}:${port}`,
      extra: {
        connectionTimeout: 15000,
        encrypted: "ENCRYPTION_ON",
        trust: "TRUST_ALL_CERTIFICATES",
        resolver: ipv4Resolver(port),
      },
    },
  ];
}

function auth() {
  return neo4j.auth.basic(process.env.COGNODB_USER || "cognodb", required("COGNODB_PASSWORD"));
}

let driver;
let connectedVia;

async function connectOne(attempt) {
  const d = neo4j.driver(attempt.uri, auth(), attempt.extra);
  try {
    await d.verifyConnectivity();
    return d;
  } catch (err) {
    await d.close();
    throw err;
  }
}

export async function ensureDriver() {
  if (driver) return driver;
  const errors = [];
  for (const attempt of connectionAttempts()) {
    try {
      driver = await connectOne(attempt);
      connectedVia = attempt.label;
      console.error(`CognoDB connected (${attempt.label})`);
      return driver;
    } catch (err) {
      errors.push(`${attempt.label}: ${err.message}`);
    }
  }
  const err = new Error(errors.join(" | "));
  err.code = "ServiceUnavailable";
  throw err;
}

export function getDriver() {
  if (!driver) {
    const err = new Error("Call ensureDriver() first");
    err.code = "CONFIG";
    throw err;
  }
  return driver;
}

export async function verify() {
  await ensureDriver();
}

export async function runRead(cypher, params = {}) {
  const session = (await ensureDriver()).session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.executeRead((tx) => tx.run(cypher, params));
    return result.records;
  } finally {
    await session.close();
  }
}

export async function runWrite(cypher, params = {}) {
  const session = (await ensureDriver()).session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const result = await session.executeWrite((tx) => tx.run(cypher, params));
    return result.records;
  } finally {
    await session.close();
  }
}

export function toNumber(value) {
  return neo4j.isInt(value) ? value.toNumber() : value;
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
    connectedVia = null;
  }
}

export function howConnected() {
  return connectedVia;
}
