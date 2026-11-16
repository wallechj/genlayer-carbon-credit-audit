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
   - The verified count is then updated deterministically on-chain: `verified = claimed − sum(upheld challenges)`, floored at zero. No LLM ever touches the credit math.
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

- Deployed contract: (fill in after deploy)
- Studio verification: (fill in after deploy — expected 28 transactions: 17 SUCCESS, 11 intentional ERRORs)
- Known boundary (same class as earlier contracts, not fixed): reading a nonexistent project or challenge fails with a raw `KeyError` (TreeMap lookup) instead of a friendly message — still rejected, not a valid read.
