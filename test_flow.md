# CarbonCreditAudit — test flow

Two Studio test accounts: A = project owner (deployer), B = challenger.
Deployed contract address: 0xa726dD7561504C142355434601333c49D8643e8F

Fixture files must be live on the repo's main branch BEFORE running the assessment steps (validators fetch them at assessment time):
- registry: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/registry.md
- monitoring report: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/monitoring_report.md
- double-count entry: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/double_count.md
- news article: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/news_article.md

## 1. Create project

As A, call create_project with examples/sample_project.json:
- project_name: "Delta Mangrove Restoration"
- registry_url: the registry fixture URL above
- monitoring_report_url: the monitoring report fixture URL above
- claimed_credits: 10000
- vintage_year: 2024
- methodology: "VM0047"

Expected: returns 0. Read back get_project(0): owner = A, claimed_credits 10000, verified_credits 10000, status "open".

Negative tests (must fail with the exact message):
- claimed_credits 0 → "claimed_credits must be greater than zero"
- registry_url "ftp://example.com/registry" → "registry_url must be an http(s) URL"
- vintage_year 1999 → "vintage_year must be between 2000 and 2100"
- methodology "" → "methodology is required"

## 2. Submit challenges 0–2

As B, call submit_challenge three times (examples/sample_challenge_double.json, sample_challenge_additionality.json, sample_challenge_vintage.json):
- 0: "1,000 credits double-counted under a second project", 1000 credits, evidence double_count.md, severity critical
- 1: "Project is not additional — mangroves were already protected", 10000 credits, evidence news_article.md, severity high
- 2: "Vintage 2024 credits have expired", 10000 credits, evidence registry.md, severity medium

Expected: returns 0, 1, 2. Read back get_challenge(i): status "submitted".

Negative tests:
- as A, submit a challenge → "project owner cannot submit challenges"
- credits_affected 0 → "credits_affected must be greater than zero"
- credits_affected 20000 (over claimed) → "credits_affected cannot exceed claimed credits"
- evidence_url "ftp://example.com/x" → "evidence_url must be an http(s) URL"
- claimed_severity "huge" → "claimed_severity must be one of critical/high/medium/low"

## 3. Assess challenges 0–2

Call assess_challenge(0), assess_challenge(1), assess_challenge(2) from either account.

Expected:
- 0: valid/critical — the registry entry itself lists serials 9001–10000 under a second project, and the second registry entry confirms the overlap. get_verified_credits(0) = 9000.
- 1: invalid — the article is about the Green Delta Reserve, a different site protected since 2019; the monitoring report confirms this project restored degraded shrimp ponds with no prior protection order. Verified stays 9000.
- 2: invalid — the registry states vintage 2024 credits may be retired through 31 December 2030; they have not expired. Verified stays 9000.
- Severity invariant holds on all three: valid carries a real bucket, invalid carries "none".

## 4. Repeat challenges

As B, submit two more challenges on project 0:
- 3: same as 0 (repeat of the accepted double-count finding), 1000 credits, evidence double_count.md, severity critical (examples/sample_challenge_repeat_accepted.json)
- 4: same as 1 (repeat of the rejected additionality claim), 10000 credits, evidence news_article.md, severity high (examples/sample_challenge_repeat_rejected.json)

Expected: returns 3, 4.

Call assess_challenge(3), assess_challenge(4).

Expected:
- 3: invalid as a duplicate — it matches prior accepted finding 0. Verified stays 9000.
- 4: invalid on its own grounding, NOT called a duplicate — the prior claim 1 was rejected, so it is not duplicate authority. Verified stays 9000.

## 5. Second project — dead registry

As A, call create_project with examples/sample_project_dead.json:
- project_name: "Phantom Forest Project"
- registry_url: https://raw.githubusercontent.com/wallechj/genlayer-carbon-credit-audit/main/examples/nonexistent_registry.md (does not exist)
- monitoring_report_url: the monitoring report fixture URL above
- claimed_credits: 5000
- vintage_year: 2024
- methodology: "VM0047"

Expected: returns 1.

As B, submit challenge 5 on project 1 (examples/sample_challenge_dead.json): "Credits claimed with no registry entry", 5000 credits, evidence monitoring_report.md, severity critical. Expected: returns 5.

Call assess_challenge(5). Expected: invalid — the registry could not be retrieved, so nothing corroborates the claim and the project itself cannot be verified. Verified credits of project 1 stay 5000 (no deduction: an unassessable project is not silently docked).

## 6. Close and reopen

Negative test: assess_challenge(0) again → "challenge has already been assessed".

As A, call close_project(0). Expected: null; get_project(0).status = "closed".

Negative test: as B, submit_challenge(0, ...) on the closed project → "project is not open for challenges".

As A, call reopen_project(0). Expected: null; get_project(0).status = "open".

## 7. Final read-backs

- get_project_count() = 2
- get_challenge_count() = 6
- get_verified_credits(0) = 9000 (10000 claimed − 1000 upheld)
- get_verified_credits(1) = 5000
- get_challenge(0): status "valid", ruled_severity "critical"
- get_challenge(1)–(5): status "invalid", ruled_severity "none"
- get_challenge_evidence(0) names the registry entry and the second registry entry

## Expected transaction count

Deploy (1) + successful calls (create 0, submit 0–2, assess 0–2, submit 3–4, assess 3–4, create 1, submit 5, assess 5, close, reopen = 16) + negative tests (11) = 28 transactions: 17 SUCCESS, 11 intentional ERRORs.
