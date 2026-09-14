# 08 — Monitoring & analytics

Resolves **Q16/Q18** (real field LCP/INP/CLS), **Q23** (everything so far has
been lab-only), and **Q25** (automating the before/after comparison — the
runtime half of topic 07's budgets).

| | branch |
|---|---|
| RUM (web-vitals), a Vitals view, Lighthouse CI | `topic/08-monitoring-rum` (off `topic/07`) |

---

## RUM: `web-vitals` → a beacon

```js
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals/attribution'
onLCP(send) // ...one per metric
```

`send` posts each metric via `navigator.sendBeacon` (falls back to
`fetch(..., { keepalive: true })`) — the point of `sendBeacon` is that it's
guaranteed to be delivered even if the page unloads mid-request, at the cost
of never telling your JS whether the server actually got it. Each payload
carries: metric name/value/`rating` (CrUX's good/needs-improvement/poor
bands), the **attribution** object (which element/event caused it — LCP's
`resourceLoadDelay`/`elementRenderDelay`, CLS's `largestShiftTarget`, INP's
`interactionTarget`/`inputDelay`), route, `connection.effectiveType`, and
`deviceMemory`. This is what turns "LCP is 4.2s" into "4.2s because of a
2.4s resourceLoadDelay on the cover image" — for real visitors, not just
whoever's manually tracing it in DevTools.

Loaded via dynamic `import()`, not a static one — RUM reporting has no
rendering job, so it shouldn't compete with the app for the entry chunk
(topic 07's lesson, applied to this topic's own code — it briefly did
compete, caught by the size-limit budget, fixed the same session).

**A real SPA gotcha, found by testing rather than assumed:** CLS/INP/LCP
only report their final value when the page is hidden or unloaded — which
for a single-page app means *never*, during a session that stays on one tab
without switching away. TTFB reports immediately (no visibility dependency)
and was verified end-to-end; the others need a real multi-page-visit session
to observe, not a quick local check.

## A Vitals view — and its honest limit

`InsightsPage` → Vitals tab reads whatever's collected (persisted to
localStorage, since this repo has no real backend) and shows count + a naive
p75 per metric. Labeled explicitly as one browser's history, not a real
field aggregate — p75 needs thousands of real visits across real devices to
mean anything (topic 01's lab-vs-field point, again).

## Lighthouse CI — runtime budgets that fail the build

Complements topic 07's `size-limit` (bytes shipped) with the other half:
runtime behavior. `lighthouserc.json` asserts performance score, CLS, TBT,
and LCP thresholds across three routes; `npm run lhci` builds, audits, and
exits 1 on a miss. Verified both directions the same way as topic 07's
budget: passes clean against the real build, fails with the specific page
and measured value named when a threshold is tightened past what the app
actually does.

(`scripts/lighthouse-ci.mjs` collects the reports itself rather than calling
`lhci autorun` directly — this machine's bundled chrome-launcher throws
during its own temp-file cleanup, after the report is already written. A
real, occasionally-necessary pattern: when the all-in-one tool doesn't work
in your environment, run the underlying CLI yourself and hand the output to
the tool's `assert` command, which is built to accept it from anywhere.)

---

## The tools (what each one actually is)

| Tool | Kind | Reach for it when |
|---|---|---|
| **`web-vitals` + your own endpoint** | RUM, DIY | you want full control over what's collected/where it goes (what this repo does) |
| **Google Analytics 4** | RUM + product analytics | you already use GA4 for everything else; Web Vitals via a GA4 event, not its primary job |
| **Vercel Speed Insights / Cloudflare Web Analytics** | RUM, zero-setup | you're already on that host; a few lines, a hosted dashboard, no server of your own |
| **Sentry Performance** | RUM + error tracking, unified | you want traces tied to the same tool that catches your exceptions (and the source maps from topic 07) |
| **SpeedCurve / Datadog RUM / Grafana Faro** | RUM + synthetic, dashboards, alerting | a team that needs p75 trends, budgets, and alerts as a real ongoing practice, not a one-off check |
| **Lighthouse CI / WebPageTest / Checkly** | Synthetic (lab, scheduled) | you want the *same test* run on a schedule/every deploy, not real-user variance |

## Dashboards, alerting, budgets & culture (brief)

A budget only works if someone owns it: who's paged when p75 LCP regresses,
who approves raising a `size-limit`/Lighthouse threshold, whether it's a
per-PR diff comment or a dashboard someone has to remember to check. None of
that is a tool decision — it's a team-process one, and the honest answer is
it varies by team size and how much traffic a regression actually costs you.
Release markers (annotating a dashboard with "deploy X happened here") are
what make "did that change help" answerable at a glance instead of an
after-the-fact investigation.

---

## Next

This was the last content topic. **Topic checklist** distills all eight into
one "what every dev should know" reference — no new code, just the summary.
