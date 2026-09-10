# Roadmap Block 11 release checklist

- Branch CI must pass quality tests, TypeScript, production build, release manifest and security audit.
- Pull-request CI must pass against the current `main` merge ref.
- Production Supabase preflight must show no unknown persisted plan/add-on/capability keys and no duplicate persistent entitlement source rows.
- Apply Block 11 entitlement migrations only after green PR gates.
- Water-K must remain `pilot` with persisted `pro` plan.
- No Business Pulse trial may be started for Water-K.
- No Office mailbox/provider receiving/DNS/MX infrastructure is activated.
- `teamChatSecureAttachments` and `apiAccess` remain reserved and fail closed.
- No K&H/vPOS configuration or storefront commerce path is changed.
- After merge, production health must remain HTTP 200 / database ok and the deployed version must match the merged `main`.
- Pre-existing Digital Office runtime errors are tracked separately and must not be attributed to Block 11 unless their frequency or routes change after release.
