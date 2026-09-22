# Storefront homepage Preview Runtime continuity — 2026-09-22

## Incident

During Playroom v20 Newsletter human acceptance, the supplied Vercel Preview root URL rendered the launch-gated `/hamarosan` surface instead of the active persisted Playroom homepage draft.

Visible consequence:

- Contact acceptance worked through the shared preview Runtime;
- the homepage did not, so a pilot tenant without a published homepage could not be used for direct human Newsletter acceptance from the Vercel Preview root.

## Root cause

The public homepage route still called `resolveCurrentStorefrontPublishedRuntimePage('home')`, while Contact and Content had already moved to the shared public static resolver that reads the exact tenant draft in Vercel Preview and the published page outside Preview.

## Shared fix

- extend the shared public static Runtime resolver to `home | content | contact`;
- add `resolveCurrentStorefrontHomeRuntimePage()`;
- route `src/app/page.tsx` through that authority;
- in Vercel Preview, render the exact persisted homepage draft;
- outside Preview, fall back to the published homepage;
- preserve the legacy homepage only as the compatibility fallback when no Page Schema exists.

## Safety boundary

This does **not** publish the homepage and does not open the pilot store. Production/public behavior remains published-only. The Preview-only draft read exists solely in the Vercel Preview environment.

## Regression invariant

**PUBLIC SYSTEM ROUTES USED FOR HUMAN ACCEPTANCE MUST NOT DROP FROM THE ACTIVE PREVIEW PAGE SCHEMA TO A LAUNCH-GATED OR LEGACY SURFACE WHEN AN EXACT PREVIEW DRAFT EXISTS.**

ONE DEFECT → ONE SHARED FIX → REGRESSION TEST → TEMPLATE FACTORY QUALITY GATE.
