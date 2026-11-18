# CarbonCreditAudit — Evidence

On-chain verification for carbon offset credits. This file records what was
verified, where, and how to check it again. Nothing here is a claim about
the future — every number below was read back from the deployed contract.

## Contract

- Address: `0xa726dD7561504C142355434601333c49D8643e8F`
- Network: GenLayer Studio, chain 61999
- Explorer: https://explorer-studio.genlayer.com/address/0xa726dD7561504C142355434601333c49D8643e8F
- Source: `contracts/carbon_credit_audit.py` in this repo
- Deployed: 2026-11-16

## What it does

A project owner registers a carbon project with its public registry entry and
auditor monitoring report; anyone except the owner can challenge claimed
credits. Validators fetch the registry and the report themselves and rule on
each challenge. A challenge is valid only if the registry or the monitoring
report corroborates it — never on the challenger's word alone, never on the
challenger's evidence page alone. The verified count is deterministic math:
`verified = claimed − sum(upheld challenges)`, floored at zero. No LLM ever
touches the credit math.

## Verified state (read back live from the contract)

State below was read directly from the contract on 2026-11-16 (deployment
verification) and re-read on 2026-11-18 — unchanged.

| | Project 0 | Project 1 |
| --- | --- | --- |
| Name | Delta Mangrove Restoration | Phantom Forest Project |
| Claimed credits | 10,000 | 5,000 |
| Verified credits | 9,000 | 5,000 |
| Methodology | VM0047 | VM0047 |
| Vintage | 2024 | 2024 |
| Status | open | open |
| Registry | live fixture (see below) | dead URL (does not exist) |

### Challenges (6 total)

| ID | Claim | Credits | Verdict | Ruled severity |
| --- | --- | --- | --- | --- |
| 0 | 1,000 credits double-counted under a second project | 1,000 | valid | critical |
| 1 | Project is not additional — mangroves already protected | 10,000 | invalid | none |
| 2 | Vintage 2024 credits have expired | 10,000 | invalid | none |
| 3 | Repeat of challenge 0 | 1,000 | invalid | none |
| 4 | Repeat of challenge 1 | 10,000 | invalid | none |
| 5 | Credits claimed with no registry entry | 5,000 | invalid | none |

Why each verdict:

- **0 valid/critical** — the registry entry itself lists serials 9001–10000
  under a second project (CM-2023-077), and the second registry entry
  confirms the overlap. Verified 10,000 → 9,000.
- **1 invalid** — the article is about the Green Delta Reserve, a different
  site; the monitoring report confirms this site was degraded shrimp ponds
  with no prior protection order.
- **2 invalid** — the registry states vintage 2024 credits may be retired
  through 31 December 2030; they have not expired.
- **3 invalid as a duplicate** — it matches prior accepted finding 0.
- **4 invalid on its own grounding, NOT a duplicate** — the prior claim 1 was
  rejected, so it is not duplicate authority.
- **5 invalid** — the registry could not be retrieved, so nothing
  corroborates the claim and the project itself cannot be verified. Verified
  credits of project 1 stay 5,000: an unassessable project is not silently
  docked.

Severity invariant holds on all six: a valid challenge always carries a real
severity bucket (critical/high/medium/low); an invalid one always carries
"none".

## Transaction count

28 transactions on Studio: deploy (1) + 16 successful calls + 11 intentional
ERRORs (negative tests). 17 SUCCESS / 11 intentional ERRORs, every step
matching `test_flow.md`. Negative tests include: owner cannot challenge,
credits 0 or over claimed, non-http(s) URLs, bad severity, assessing an
already-assessed challenge, challenging a closed project.

## Fixtures (validators fetch these at assessment time)

- Registry: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/registry.md
- Monitoring report: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/monitoring_report.md
- Double-count entry: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/double_count.md
- News article: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/news_article.md

## Live product

- Site: https://genlayer-carbon-credit-frontend.vercel.app/
- Frontend repo: https://github.com/wallechj/genlayer-carbon-credit-frontend
- The site reads the two projects and six challenges live from the contract
  (no wallet needed); wallet writes (create project, submit challenge,
  assess, close/reopen) run on Studio chain 61999 and wait for FINALIZED
  before showing a result.

## How to re-verify

1. Open the explorer link above and read `get_project_count` (2),
   `get_challenge_count` (6), `get_verified_credits(0)` (9000),
   `get_verified_credits(1)` (5000).
2. Or run `node verify-state.mjs` in this repo (genlayer-js, Studio endpoint).
3. Or open the live site and compare its Verify section with this file.

## Boundaries

- Verifies claims against the declared registry entry and monitoring report
  only; it does not audit the registry itself or the auditor.
- An unretrievable registry means the challenge is invalid and the project is
  not silently docked — unverifiable is not the same as guilty.
- Known boundary (same class as earlier contracts, not fixed): reading a
  nonexistent project or challenge fails with a raw `KeyError` (TreeMap
  lookup) instead of a friendly message — still rejected, not a valid read.
