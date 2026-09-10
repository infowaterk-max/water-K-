# Support Knowledge — Digital Office / Team Chat responsive incident (2026-09-10)

## Purpose

Durable support/engineering record for the Digital Office and Team Chat responsive regressions observed during production acceptance. This file records symptoms, assumptions, attempted fixes, regressions and the evidence required before any future responsive change is accepted.

## Product scope

Affected surfaces:
- `/admin/kommunikacio/iroda` and its customer-email conversation/workstation views;
- `/admin/kommunikacio/chat` Team Chat;
- `/admin/kommunikacio/felugyelet` Send Center;
- the shared admin shell when an Android browser uses **Desktop site / Asztali webhely** mode.

Do not conflate two independent modes:
1. **Normal mobile mode**: native <=850px mobile UX, single-pane flows.
2. **Mobile browser with Desktop site enabled**: intentionally exposes a desktop-sized layout viewport. The accepted product direction is to show a real desktop workspace that may require browser pan/zoom; do not force the mobile single-pane UX into this mode.

## Observed production symptoms

### A. Original desktop-site compression
On a phone with Desktop site enabled, the full desktop admin sidebar and Digital Office workstation were compressed into the narrow physical screen. Text and controls became unreadable.

### B. Forced-mobile desktop-site attempt
A compatibility bridge attempted to detect a touch phone in Desktop site mode and force the mobile shell/workstation. This produced hybrid layouts because older responsive CSS and inner desktop grids still applied. Example symptom: Send Center approval cards became extremely narrow and text wrapped letter-by-letter.

### C. Responsive contract v2
PR #180 replaced the counter-zoom/forced-mobile approach with a clean contract:
- normal phone mode keeps the native mobile UX;
- Desktop site mode keeps a real 1440px desktop workspace with browser pan/zoom.

This removed the severe compressed-card failure and remains the current safer baseline for further diagnosis.

### D. Large empty area in Desktop site mode
After v2, a phone screenshot showed the desktop workspace occupying only the upper part of the physical display with a large empty area underneath. This was an observed visual defect, but its exact browser scaling mechanics were not fully measured before the next change.

### E. Scroll report was misattributed
A user report stated that a mobile screen did not scroll. Engineering initially treated this as a Team Chat scroll-chain problem because the Team Chat CSS contains an internal `.teamChatMessages` scroller with `overscroll-behavior: contain`.

**Correction:** it was later clarified that the non-scrolling view may have been the **customer-email / Ügyféllevelezés mobile workspace**, not Team Chat. Therefore Team Chat must NOT be recorded as the proven root cause of that report.

### F. PR #181 regression
PR #181 introduced dynamic height compensation based on the 1440px desktop canvas width ratio and changed Team Chat scroll chaining. Production acceptance showed the desktop-site vertical problem became substantially worse: the workspace became extremely tall with a large artificial empty region. This proved the height-compensation hypothesis was not sufficiently validated.

PR #181 is therefore an **explicitly rejected approach** and should not be reintroduced without measured browser viewport evidence.

## Rejected / unsafe approaches

Do not repeat these without new evidence:
- Do not counter-zoom the entire admin app to a synthetic 360–480px canvas.
- Do not force native mobile panes when the browser explicitly requests Desktop site.
- Do not infer physical screen height from the 1440px/layout-width ratio and apply that ratio directly as a CSS min-height/height multiplier.
- Do not diagnose a nested scroll container solely from a screenshot when the exact affected route has not been confirmed.
- Do not keep stacking new responsive CSS layers over existing ones without first mapping selector order, breakpoints and `!important` precedence.

## Required diagnostic procedure before the next fix

For every future report, capture these facts first:
1. Exact route (`Ügyféllevelezés`, `Team Chat`, `Küldési központ`, etc.).
2. Browser normal mode or Desktop site mode.
3. Portrait/landscape orientation.
4. Whether the problem is page scroll, inner-panel scroll, horizontal pan, zoom, or fixed/sticky obstruction.
5. `window.innerWidth`, `window.innerHeight`, `visualViewport.width`, `visualViewport.height`, `devicePixelRatio`, `screen.width`, `screen.height` when reproducible.
6. Whether `.adminGrid[data-desktop-site-touch="true"]` is active.
7. Which element is the active scroll container (`document.scrollingElement`, `.digitalOfficeConversationPane`, `.digitalOfficeThreadListPane`, `.teamChatMessages`, etc.).
8. Computed `height`, `min-height`, `overflow`, `position`, `overscroll-behavior` for the affected chain.

Do not ship the next fix until the exact route and scroll owner are confirmed.

## CSS layers that can conflict

The Digital Office/admin responsive behaviour is distributed across multiple generations of CSS, including:
- `src/app/admin/admin-responsive-final.css`
- `src/app/admin/deferred-ui-polish.css`
- `src/app/admin/communication-pilot-fixes.css`
- `src/app/admin/digital-office-workstation.css`
- `src/app/admin/digital-office-mobile-final.css`
- `src/app/admin/team-chat-workspace.css`
- `src/app/admin/kommunikacio/mobile-desktop-compat.css`

Before adding another responsive override, inspect the full cascade and consolidate where possible. `!important` chains are a known regression risk here.

## Stable product intent

### Normal mobile
- Customer email: list -> conversation -> customer/order/task context.
- Team Chat: people/conversation list -> selected chat -> info/participants.
- Mobile must have usable vertical scrolling and controls must never be trapped below a fixed-height viewport.

### Desktop site on a phone
- Deliver the real desktop admin/workspace rather than a fake mobile rendering.
- Horizontal pan/zoom is acceptable.
- The page must not create artificial multi-screen blank vertical space.

## Release history relevant to this incident

- PR #176: final Digital Office workstation UX.
- PR #178: Messenger-like Team Chat + mobile Digital Office UX + presence foundation.
- PR #179: first Desktop-site compatibility attempt; detection/forced-mobile direction proved unreliable.
- PR #180: responsive contract v2; real desktop workspace in Desktop-site mode. Safer baseline.
- PR #181: dynamic height compensation + assumed Team Chat scroll-chain fix. Rejected after production screenshot and user clarification.

## Current support status

After reverting PR #181 behaviour, known unresolved items remain:
- Desktop-site mode may still have a vertical empty-space issue from the v2 baseline; root cause not yet proven.
- Normal mobile customer-email scrolling must be reproduced and diagnosed explicitly.
- Team Chat scrolling should be tested independently; do not assume it shares the customer-email scroll defect.

When the final proven fix is released, append the exact root cause, the final selector/component changes, the regression test(s), production commit, browser/device evidence and a short support playbook here. Never overwrite the failed-attempt history.
