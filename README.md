# CarbonCreditAudit

On-chain verification for carbon offset credits. A project owner registers a carbon project with its public registry entry and auditor monitoring report; anyone except the owner can challenge claimed credits. Validators fetch the registry and the report themselves, rule on each challenge, and the verified credit count is a deterministic on-chain subtraction of upheld challenges.

## Why this exists

A carbon credit is only worth something if the tonne it represents is real, counted once, and additional — and buyers cannot check that from a project's own marketing page. The evidence that settles it lives in two public places: the carbon registry entry (what was issued, which serials, which vintage) and the auditor's monitoring report (what was actually measured). CarbonCreditAudit puts the check on-chain: validators fetch both, not the challenger's word.

## How it works

1. **create_project** — the project owner registers a project, naming the registry URL, the monitoring report URL, the claimed credits, the vintage year, and the methodology. The registry and report URLs are declared by the owner at creation, so validators know exactly which documents govern the project. Verified credits start equal to claimed credits.
2. **submit_challenge** — anyone except the owner can challenge credits: a title, a statement, the number of credits affected, a supporting evidence URL, and a claimed severity. The affected credits cannot exceed the claimed total.
3. **assess_challenge** — validators fetch the registry entry, the monitoring report, and the challenger's evidence page themselves, then decide:
   - **valid** only if the fetched registry or monitoring report corroborates the problem — the named credits are double-counted, lack monitoring data, fail additionality, or fall outside the stated vintage or methodology. A challenge is never valid on the challenger's word alone, and never valid on the challenger's evidence page alone: the registry or the report must corroborate it. If the registry could not be retrieved, the challenge is invalid.
   - **invalid** otherwise — including a challenge that matches a rejected prior challenge (judged on its own grounding) or a challenge that repeats an accepted finding (a duplicate).
   - `valid` must be a true JSON boolean; a valid challenge always carries a real severity bucket (critical/high/medium/low), an invalid one always carries "none".
   - Validators also determine the evidence-supported number of affected credits (`verified_credits` in the verdict): the exact count the fetched registry or report supports — for example, the size of the overlapping serial range actually listed. It must be a positive integer no larger than the challenger's claimed number, or the verdict is malformed and the challenge is rejected. The deduction uses only that bounded number, capped at the remaining verified credits, and the number is stored on-chain as `verified_credits_affected`. The challenger's claimed number is never deducted on trust.
   - The verified count is then updated deterministically on-chain: `verified = claimed − sum(upheld verified deductions)`, floored at zero. No LLM ever touches the credit math.
   - Duplicate protection covers every prior accepted finding: the full history (no truncation) is shown to the validators, and an exact replay — same title and same evidence as an accepted finding — is rejected on-chain without a validator call.
4. **close_project / reopen_project** — the owner closes or reopens the project (no challenges or assessments while closed).

Every verdict carries a one-sentence evidence note stored on-chain, naming the fetched material that decided it.

## What validators actually fetch

- The registry entry (declared at project creation).
- The auditor monitoring report (declared at project creation).
- The challenger's supporting evidence page (declared per challenge).
- Nothing else. No party-supplied text is treated as proof; the challenger's statement is read as an allegation and weighed against the fetched registry and report.

## The demo project

`examples/` holds the full demo flow, with fixture files:

| Challenge | Claim | Expected |
| --- | --- | --- |
| 0 | 1,000 credits double-counted (serials 9001–10000 also under project CM-2023-077) | valid/critical — the registry entry itself lists the overlap, and the second entry confirms it. Verified 10,000 → 9,000 |
| 1 | Project not additional — mangroves already protected since 2019 | invalid — the article is about the Green Delta Reserve, a different site; the monitoring report confirms this site was degraded shrimp ponds with no prior protection order |
| 2 | Vintage 2024 credits have expired | invalid — the registry states vintage 2024 credits may be retired through 31 December 2030 |
| 3 | Repeat of challenge 0 | invalid as a duplicate — it matches prior accepted finding 0 |
| 4 | Repeat of challenge 1 | invalid on its own grounding, NOT a duplicate — the prior claim was rejected |
| 5 | Credits claimed with no registry entry (second project, dead registry URL) | invalid — the registry could not be retrieved |

Claimed 10,000, upheld 1,000, verified 9,000. A second project with an unretrievable registry entry cannot be verified and is not silently docked.

A third project proves the v2 bound: Kelp Forest Restoration claims 2,000 credits, and a challenge claims 1,000 double-counted — but the registry shows an overlap of only 400 serials (1601–2000). The validators determine 400, so verified is 2,000 → 1,600, not 1,000. A reworded replay of the oldest accepted finding is still caught as a duplicate, proving the full history is checked.

## Files

- `contracts/carbon_credit_audit.py` — the contract
- `test_flow.md` — step-by-step verification, including negative tests
- `examples/sample_project.json`, `examples/sample_project_dead.json`, `examples/sample_challenge_*.json` — exact inputs for the demo
- `examples/` — registry entry, monitoring report, second registry entry, and news article, as plain fetchable files

## Deploy

1. Upload `contracts/carbon_credit_audit.py` to GenLayer Studio and deploy.
2. Follow `test_flow.md` with two test accounts (project owner, challenger).
3. Verify every write with a view read-back (`get_project`, `get_challenge`, `get_verified_credits`).

## Verification

- Deployed contract (v2): 0x44C6fE01e66B38157a2C5f970dA2220e9da5aD95 ([explorer](https://explorer-studio.genlayer.com/address/0x44C6fE01e66B38157a2C5f970dA2220e9da5aD95)), deployed 2026-11-21 on GenLayer Studio (chain 61999).
- Studio verification 2026-11-21: 34 transactions — 22 SUCCESS, 12 intentional ERRORs (deploy 1 + 21 successful calls + 12 negative tests), every step matching `test_flow.md`.
- v2 changes (steward review 2026-11-20): the deduction uses the validator-determined evidence-supported number only (challenge 6 proves it: 1,000 claimed, 400 supported, 400 deducted, verified 2,000 → 1,600); duplicate protection covers every prior accepted finding with no truncated history, plus a deterministic exact-replay guard (challenge 3: "duplicate of accepted finding #0"; challenge 7: reworded replay of the oldest finding still caught).
- Challenge 0 valid/critical: 1,000 credits double-counted (serials 9001–10000 under both CM-2024-118 and CM-2023-077), verified 10,000 → 9,000. Challenges 1–5 invalid: additionality article about a different site, vintage valid through 2030, repeat of the accepted finding (duplicate), repeat of the rejected claim (own grounding), dead registry. Severity invariant holds on all eight. 12 negative tests pass.
- v1 contract remains live at 0xa726dD7561504C142355434601333c49D8643e8F ([explorer](https://explorer-studio.genlayer.com/address/0xa726dD7561504C142355434601333c49D8643e8F)), deployed 2026-11-16, 28 transactions (17 SUCCESS / 11 ERRORs).
- Known boundary (same class as earlier contracts, not fixed): reading a nonexistent project or challenge fails with a raw `KeyError` (TreeMap lookup) instead of a friendly message — still rejected, not a valid read.
