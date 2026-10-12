# F35 – Loot Vault v2 verified shopping and E10 editorial proof
Date: 2026-10-12. Base PR #1245 F34; canonical candidate gaming.loot-vault@2.

## Runtime blocker
F34 exact-head Factory quality run 38177932233 attempt 2 passed the 14x3 matrix, E13 functional proof, Preview provenance and real Workforce auth. PO proof failed because the Home Product Grid declared `showPurchaseActions:true` but rendered no purchase button, the PDP had no product/slug/quantity demo binding so the canonical stock guard rightly disabled purchase, and Blog index contained no `story.feature`. Preserve these failures as a blocking external handoff.

## Bounded architecture
- The shared Product Grid opts into the existing identity/stock-guarded `StorefrontPurchaseControlsClient` only where the authored config asks for real card purchase actions.
- Preview-only, Loot Vault-scoped demonstration fixtures supply stable fake-in-preview identifiers and stock that never flow into installed storefront authority. Preorder has zero quantity.
- The original cart confirmation and `CartProvider.add` are used. Preview rewrites only the confirmation cart URL, preserving exact key/version/viewport/factory marker.
- The existing featured Blog story maps to the canonical Story Feature renderer. The separate story index remains; no duplicate marketing section is added.

## Non-goals / release proof
No real order/payment submission, Supabase mutation, production release, CI gate weakening, human PO acceptance or main merge. Exact-head CI, 14x3 QA, source-stamped Vercel Preview and genuine PO shopping/browser proof remain mandatory. External Factory evidence manifest reconciliation remains a separate closure dependency.
