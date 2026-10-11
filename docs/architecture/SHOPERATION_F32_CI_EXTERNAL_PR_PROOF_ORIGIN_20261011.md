# F32 – Exact PR external proof origin selection

2026-10-11; parent F31 PR #1236 at `8caec2ab32e947156e6514bd2b01459c7285d258`.

Source CI previously resolved a successful push canary despite a successful exact-head 14×3 PR producer. This source unit fixes **release-infrastructure only**. The eligible producer requires a current open PR from this repository with identical head SHA, head ref and base SHA to the active transaction plan. Its workflow run must independently carry the same PR identity and exact immutable head/base, and must be a successful `pull_request` event. No historical push canary is accepted as visual completion.

The existing artifact checksum, browser case completeness, runtime origin, Vercel Preview, and actual Product Owner handoff validations remain separate and unweakened. Negative tests cover wrong SHA/branch/base, closed and merged PRs, foreign head/base repositories, push-only producers and missing metadata. This unit claims only source-side proof selection, not Factory acceptance. F31's candidate identity, showroom and PO journey remain blocked until genuinely proven.

No main merge, Vercel/Supabase writes, extra deployments, production changes, or arbitrary run pinning.
