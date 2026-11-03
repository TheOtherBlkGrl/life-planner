# planner-apply-bridge (Cloudflare Worker)

Decisions queue for the planner's Job Hunt tab. Clarissa clicks Apply / Not for me
on a lead card; app.js POSTs the decision here so the 10am and 7pm apply runs can
process it. Public endpoints (CORS locked to the GitHub Pages origin):

- GET  /api/health            -> {"ok":true,...}
- GET  /api/decisions         -> queue, newest first
- POST /api/decisions         body {"id","decision":"apply"|"reject","title","company","url","lane","pay"} (dedupes by id)
- POST /api/decisions/clear   body {"ids":[...]}

Storage: KV namespace planner-decisions bound as DECISIONS (id 998a292cd66345cbbad32b1ea239a91f).
Run notes (agent-side): decision-queue worker only; no auth beyond CORS scope, and
no secrets in this repo. Clear token handling is documented in the agent workspace,
not here.
