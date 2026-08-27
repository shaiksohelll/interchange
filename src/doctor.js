import "dotenv/config";
import dns from "node:dns/promises";
import net from "node:net";
import { closeDriver, connectionAttempts, ensureDriver, howConnected } from "./db.js";

function redact(uri) {
  return uri.replace(/:\/\/[^/]+/, (m) => m.replace(/:[^:@]+@/, ":***@"));
}

function tcp(host, port, ms = 8000) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port, family: 4 });
    const t = setTimeout(() => {
      sock.destroy();
      resolve(`timeout after ${ms}ms`);
    }, ms);
    sock.on("connect", () => {
      clearTimeout(t);
      sock.end();
      resolve("open");
    });
    sock.on("error", (err) => {
      clearTimeout(t);
      resolve(err.message);
    });
  });
}

async function main() {
  const raw = process.env.COGNODB_URI || "";
  const pass = process.env.COGNODB_PASSWORD || "";
  const host = raw.replace(/^[a-z0-9+]+:\/\//i, "").split("/")[0].split(":")[0];
  console.log("scheme:", (raw.split("://")[0] || "(missing)"));
  console.log("host:", host || "(missing)");
  console.log("user:", process.env.COGNODB_USER || "(missing)");
  console.log("password length:", pass.length, pass.length ? "(hidden)" : "(empty)");

  if (host) {
    try {
      const v4 = await dns.lookup(host, { family: 4, all: true });
      console.log("dns ipv4:", v4.map((x) => x.address).join(", ") || "none");
    } catch (err) {
      console.log("dns ipv4:", err.message);
    }
    console.log("tcp 7687 ipv4:", await tcp(host, 7687));
  }

  console.log("attempts:");
  for (const a of connectionAttempts()) {
    console.log(" -", a.label, redact(a.uri));
  }

  try {
    await ensureDriver();
    console.log("connected via:", howConnected());
  } catch (err) {
    console.log("connect failed:");
    console.log(err.message);
    process.exitCode = 1;
  } finally {
    await closeDriver();
  }
}

main();
