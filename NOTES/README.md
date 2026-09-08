# NOTES — Frontend Performance & Monitoring

One `.md` per topic. `master` holds ONLY these writeups + the pristine Vite scaffold.
No app-code changes land on `master`.

## Workflow (per topic)

1. Branch off the previous topic's branch (chained):
   `topic/01-metrics-baseline → topic/02-loading-bundle → … → topic/08-monitoring-rum`
2. Build the change on the branch in small commits.
3. Actually run it: `npm run build` + browser smoke-test (MCP browser) or `npm test`.
4. Write `NOTES/NN-name.md` on `master` (copy via temp path — NOTES doesn't exist on topic branches),
   `git checkout master` to commit it.
5. Each doc ends with **"Next questions this raises"**; later topics resolve those explicitly.

## Topic → branch map

| # | Topic | Branch |
|---|-------|--------|
| 01 | Metrics vocabulary + baseline (LCP/INP/CLS, lab vs field, p75) | `topic/01-metrics-baseline` |
| 02 | Loading: bundle analysis + code-splitting | `topic/02-loading-bundle` |
| 03 | Assets: images + fonts + critical path | `topic/03-images-fonts` |
| 04 | Runtime/rendering: React re-renders, memo, transitions, workers, virtualization | `topic/04-runtime-rendering` |
| 05 | Layout stability + INP | `topic/05-layout-inp` |
| 06 | Network layer: waterfalls, caching, data-fetching patterns | `topic/06-network-data` |
| 07 | Build & delivery: chunking, budgets, CI | `topic/07-build-delivery` |
| 08 | Monitoring & analytics: RUM, synthetic, dashboards | `topic/08-monitoring-rum` |
