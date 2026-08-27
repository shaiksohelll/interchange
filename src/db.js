import neo4j from "neo4j-driver";

function required(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`Missing ${name}. Copy .env.example to .env and fill CognoDB connection details.`);
    err.code = "CONFIG";
    throw err;
  }
  return value;
}

let driver;

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(
      required("COGNODB_URI"),
      neo4j.auth.basic(process.env.COGNODB_USER || "cognodb", required("COGNODB_PASSWORD"))
    );
  }
  return driver;
}

export async function verify() {
  const d = getDriver();
  await d.verifyConnectivity();
}

export async function runRead(cypher, params = {}) {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.executeRead((tx) => tx.run(cypher, params));
    return result.records;
  } finally {
    await session.close();
  }
}

export async function runWrite(cypher, params = {}) {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
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
  }
}
