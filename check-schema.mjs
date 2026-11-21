// Compile-check the v2 contract via gen_getContractSchemaForCode before deploying.
// Usage: node check-schema.mjs (run from this directory; genlayer-js is symlinked in node_modules)
import { readFileSync } from "node:fs";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const endpoint = "https://studio.genlayer.com/api";
const chain = {
  ...studionet,
  id: 61999,
  name: "GenLayer Studio",
  rpcUrls: { default: { http: [endpoint] } },
};
const account = createAccount(generatePrivateKey());
const client = createClient({ chain, endpoint, account });
const code = readFileSync("contracts/carbon_credit_audit.py", "utf8");

try {
  const schema = await client.getContractSchemaForCode(code);
  const s = JSON.stringify(schema);
  console.log("schema OK, bytes:", s.length);
  console.log(s.slice(0, 3000));
} catch (e) {
  console.log("schema FAILED:", String(e).slice(0, 3000));
  process.exit(1);
}
