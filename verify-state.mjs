// Read-back verification for the deployed CarbonCreditAudit contract on Studio (61999).
// Usage: node verify-state.mjs   (run from this directory; genlayer-js is symlinked in node_modules)
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const ADDRESS = "0x44C6fE01e66B38157a2C5f970dA2220e9da5aD95";
const endpoint = "https://studio.genlayer.com/api";
const chain = {
  ...studionet,
  id: 61999,
  name: "GenLayer Studio",
  rpcUrls: { default: { http: [endpoint] } },
};
const account = createAccount(generatePrivateKey());
const client = createClient({ chain, endpoint, account });

async function read(fn, args = []) {
  for (let i = 0; i < 5; i++) {
    try {
      return await client.readContract({ address: ADDRESS, functionName: fn, args });
    } catch (e) {
      if (i === 4) throw e;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

const out = {};
out.project_count = await read("get_project_count");
out.challenge_count = await read("get_challenge_count");
out.verified_credits_0 = await read("get_verified_credits", [0]);
out.verified_credits_1 = await read("get_verified_credits", [1]);
out.verified_credits_2 = await read("get_verified_credits", [2]);
out.project_0 = await read("get_project", [0]);
out.project_1 = await read("get_project", [1]);
out.project_2 = await read("get_project", [2]);
out.challenges = [];
for (let i = 0; i < 8; i++) {
  const c = await read("get_challenge", [i]);
  out.challenges.push({
    id: i,
    status: c.status ?? c?.get?.("status"),
    ruled_severity: c.ruled_severity,
    credits_affected: c.credits_affected,
    verified_credits_affected: c.verified_credits_affected,
    title: c.title,
  });
}
console.log(JSON.stringify(out, null, 2));
