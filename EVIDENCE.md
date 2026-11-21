# CarbonCreditAudit — Evidence

On-chain verification for carbon offset credits. This file records what was
verified, where, and how to check it again. Nothing here is a claim about
the future — every number below was read back from the deployed contract.

## Contract (v2)

- Address: `0x44C6fE01e66B38157a2C5f970dA2220e9da5aD95`
- Network: GenLayer Studio, chain 61999
- Explorer: https://explorer-studio.genlayer.com/address/0x44C6fE01e66B38157a2C5f970dA2220e9da5aD95
- Source: `contracts/carbon_credit_audit.py` in this repo
- Deployed: 2026-11-21
- v1 contract remains live at `0xa726dD7561504C142355434601333c49D8643e8F` (deployed 2026-11-16); v2 is a new deployment, not an upgrade in place.

## What changed in v2 (steward review 2026-11-20)

1. **Bounded deduction.** Validators independently determine the evidence-supported number of affected credits (`verified_credits` in the verdict) and only that bounded number is deducted — never the challenger's claimed number on trust. The number must be a positive integer no larger than the claimed amount, or the verdict is malformed and the challenge is rejected. The deduction is capped at the remaining verified credits. The determined number is stored on-chain as `verified_credits_affected` on the challenge.
2. **Duplicate protection covers every prior accepted finding.** The prior-history prompt is no longer truncated, and an exact replay (same title and same evidence as an accepted finding) is rejected on-chain by a deterministic guard without a validator call.

## What it does

A project owner registers a carbon project with its public registry entry and
auditor monitoring report; anyone except the owner can challenge claimed
credits. Validators fetch the registry and the report themselves and rule on
each challenge. A challenge is valid only if the registry or the monitoring
report corroborates it — never on the challenger's word alone, never on the
challenger's evidence page alone. The verified count is deterministic math:
`verified = claimed − sum(upheld verified deductions)`, floored at zero. No LLM ever
touches the credit math. Each upheld deduction is the evidence-supported number
the validators determined themselves, not the number the challenger claimed.

## Verified state (read back live from the contract)

State below was read directly from the contract on 2026-11-21 (v2 deployment
verification) and re-read the same day — unchanged.

| | Project 0 | Project 1 | Project 2 |
| --- | --- | --- | --- |
| Name | Delta Mangrove Restoration | Phantom Forest Project | Kelp Forest Restoration |
| Claimed credits | 10,000 | 5,000 | 2,000 |
| Verified credits | 9,000 | 5,000 | 1,600 |
| Methodology | VM0047 | VM0047 | VM0047 |
| Vintage | 2024 | 2024 | 2024 |
| Status | open | open | open |
| Registry | live fixture (see below) | dead URL (does not exist) | live fixture (see below) |

### Challenges (8 total)

| ID | Claim | Credits claimed | Verified affected | Verdict | Ruled severity |
| --- | --- | --- | --- | --- | --- |
| 0 | 1,000 credits double-counted under a second project | 1,000 | 1,000 | valid | critical |
| 1 | Project is not additional — mangroves already protected | 10,000 | 0 | invalid | none |
| 2 | Vintage 2024 credits have expired | 10,000 | 0 | invalid | none |
| 3 | Repeat of challenge 0 | 1,000 | 0 | invalid | none |
| 4 | Repeat of challenge 1 | 10,000 | 0 | invalid | none |
| 5 | Credits claimed with no registry entry | 5,000 | 0 | invalid | none |
| 6 | 1,000 credits double-counted (Kelp, partial overlap) | 1,000 | 400 | valid | critical |
| 7 | Reworded replay of challenge 0 | 1,000 | 0 | invalid | none |

Why each verdict:

- **0 valid/critical** — the registry entry itself lists serials 9001–10000
  under a second project (CM-2023-077), and the second registry entry
  confirms the overlap. Verified 10,000 → 9,000.
- **1 invalid** — the article is about the Green Delta Reserve, a different
  site; the monitoring report confirms this site was degraded shrimp ponds
  with no prior protection order.
- **2 invalid** — the registry states vintage 2024 credits may be retired
  through 31 December 2030; they have not expired.
- **3 invalid as a duplicate** — caught by the deterministic exact-replay
  guard: same title and same evidence as accepted finding 0.
- **4 invalid on its own grounding, NOT a duplicate** — the prior claim 1 was
  rejected, so it is not duplicate authority.
- **5 invalid** — the registry could not be retrieved, so nothing
  corroborates the claim and the project itself cannot be verified. Verified
  credits of project 1 stay 5,000: an unassessable project is not silently
  docked.
- **6 valid/critical, bounded to 400** — the challenger claimed 1,000
  double-counted, but the registry proves an overlap of only 400 serials
  (CM-2024-205-1601 to CM-2024-205-2000). Validators determined 400, so
  verified 2,000 → 1,600, not 1,000. This is the v2 proof that the
  challenger's number is never deducted on trust.
- **7 invalid as a duplicate** — reworded repeat of accepted finding 0,
  caught by the validators from the full prior-accepted-findings history
  (the deterministic guard does not apply: the title differs). Proves the
  history is not truncated: the oldest finding is still caught after later
  findings were accepted.

Severity invariant holds on all eight: a valid challenge always carries a real
severity bucket (critical/high/medium/low); an invalid one always carries
"none".

## Transaction count

34 transactions on Studio: deploy (1) + 21 successful calls + 12 intentional
ERRORs (negative tests). 22 SUCCESS / 12 intentional ERRORs, every step
matching `test_flow.md`. Negative tests include: owner cannot challenge,
credits 0 or over claimed, non-http(s) URLs, bad severity, assessing an
already-assessed challenge, challenging a closed project, non-owner closing a
project.

## Fixtures (validators fetch these at assessment time)

- Registry: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/registry.md
- Monitoring report: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/monitoring_report.md
- Double-count entry: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/double_count.md
- News article: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/news_article.md
- Partial-overlap registry (Kelp, CM-2024-205): https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/registry_partial.md
- Partial-overlap second entry (400 serials): https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/double_count_partial.md
- Partial-overlap monitoring report: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/monitoring_report_partial.md

## Live product

- Site: https://genlayer-carbon-credit-frontend.vercel.app/ (reads the v2 contract since 2026-11-21 15:36)
- Frontend repo: https://github.com/wallechj/genlayer-carbon-credit-frontend
- The site reads the projects and challenges live from the contract
  (no wallet needed); wallet writes (create project, submit challenge,
  assess, close/reopen) run on Studio chain 61999 and wait for FINALIZED
  before showing a result.

## How to re-verify

1. Open the explorer link above and read `get_project_count` (3),
   `get_challenge_count` (8), `get_verified_credits(0)` (9000),
   `get_verified_credits(1)` (5000), `get_verified_credits(2)` (1600).
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
