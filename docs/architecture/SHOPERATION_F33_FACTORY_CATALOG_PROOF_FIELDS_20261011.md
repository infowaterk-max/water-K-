# F33 Factory catalog compiler proof fields

## Confirmed missing edge
On the F31 quality artifact for `gaming.loot-vault@2`, all 42 browser cases pass and the compiler declares `productOwnerReady=true`, but the candidate's `provenance=null` and `showroomEvidence=[]`. The real compiler report already produces both fields in `src/lib/builder/template-factory/scaffold.ts`. The QA catalog `src/app/api/visual-fidelity/templates/route.ts` omitted them.

## Bounded repair
The Factory candidate response now forwards `build.report.provenance` and a copy of `build.report.showroomEvidence`. No fields are synthesized, no external handoff checks are removed, non-Factory templates stay unchanged, and the internal endpoint stays behind `VISUAL_FIDELITY_QA=1`. Tests compare the actual GET result to the compiler's report and verify 20 shopper surface rows.

## Remaining obligations
This is source proof transport, not User/PO visual acceptance. Quality Gate must rerun a canonical 14-page × 3-viewport browser matrix when fingerprints require it, verify exact runtime/Preview source and E13 functional proof, then run real Product Owner authentication and showroom navigation. The template must not be promoted merely because these data fields exist. F33 is stacked on F32 (PR #1238) and F31 (PR #1236), not on main. No product deployment or customer data changes are authorized.
