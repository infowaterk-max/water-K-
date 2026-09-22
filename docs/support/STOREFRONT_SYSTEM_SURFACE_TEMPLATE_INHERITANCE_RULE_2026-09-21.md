# Storefront System Surface Template Inheritance Rule — 2026-09-21

Status: CANONICAL / REQUIRED
Scope: all storefront templates, current and future

## Non-negotiable invariant

CUSTOMER-FACING SYSTEM SURFACES MUST INHERIT THE ACTIVE STOREFRONT TEMPLATE AND MUST REMAIN FUNCTIONAL.

This includes consent banners, authentication, customer-account entry, overlays, notices, drawers, footer controls, social links and other platform-owned UI shown inside the storefront.

## Cookie / consent surfaces

- Must remain fully inside the viewport on desktop, tablet and mobile.
- Mobile positioning must not combine fixed left/right offsets with a stale translate transform.
- Consent UI must inherit active storefront design tokens where available.
- Generic legacy beige/white presentation must not override an active template.
- Required actions must remain reachable without browser zoom or horizontal scrolling.

## Footer / social surfaces

Decorative text glyphs MUST NOT impersonate interactive social icons.

Social controls must:
- be real semantic links;
- have accessible labels;
- use configured merchant URLs;
- disappear when no valid URL is configured rather than linking to fake or placeholder destinations;
- remain editable through shared storefront data/configuration, not template-local hardcoding.

## Acceptance gate

A template cannot reach final human visual acceptance while:
1. a system-owned overlay visually breaks template inheritance;
2. a fixed overlay protrudes outside the mobile viewport;
3. a displayed icon/control is non-functional;
4. a social control uses fake placeholder links;
5. the defect is only patched locally when the primitive or shared system surface is at fault.

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE.
