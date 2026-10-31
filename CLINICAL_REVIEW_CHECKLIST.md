# Clinical review checklist — Caries Learning Studio and Caries Quest

**Status: `draft_pending_review`.** No qualified person has reviewed anything listed here.
The earlier sign-off of 2026-10-21 (README §9) covers the procedural modules and does **not**
extend to this content. Until a reviewer completes this checklist, every item stays
`draft_pending_review` in code and the app shows "Draft · requires expert verification" beside
its references.

How to record a review:
1. The reviewer ticks each item, writes any requested change, and signs the table at the end.
2. Apply the changes in the source files named here.
3. Set `verification: 'expert-reviewed'` on the approved items (`STUDIO_STATUS` in
   `src/data/studio/cariesLesson.ts`, the `lamina` entry in `src/data/anatomy.ts`, and
   `LOWER_MOLAR_47.verification` in `src/data/studio/assets.ts`).
4. Add an addendum to `CONTENT_REVIEW.addenda` in `src/data/review.ts`, then update
   `src/tests/content.test.ts`.

Reviewer qualifications: a dentist or dental educator with current knowledge of cariology.
Ideally a second reviewer checks the anatomy.

---

## A. 3D model representation (`src/data/studio/assets.ts`, `public/models/dental/ASSET_CATALOG.md`)

- [ ] A1. The scanned tooth is labelled as a *mandibular right second molar (Universal #31, FDI 47)*. Is the identification plausible from the morphology?
- [ ] A2. The evidence tiers shown to students are accurate and clear: tooth surface and pulp *measured*; enamel *derived* (thickness from the literature); PDL and lamina dura *derived* and drawn thicker than in reality.
- [ ] A3. "Dentin and root" is presented as the tooth volume outside the pulp and under the enamel, and cementum is stated as not shown separately. Is that acceptable for teaching?
- [ ] A4. The cut-face colours (enamel light grey-blue, dentin peach, pulp coral, PDL pink, lamina dura beige) do not mislead.
- [ ] A5. Enamel distribution in section (thick over the cusps, thinning cervically) looks plausible on this model. Note: the thickness is literature-derived.
- [ ] A6. The section is mesiodistal through the crown centre (z = 0 in the app frame). Is the stated orientation correct?

## B. Lesson stages (`LESSON_STAGES` in `src/data/studio/cariesLesson.ts`)

For each stage, check the objective, "What you see", the explanation, the split between scan and overlay, the clinical concepts and the references.

- [ ] B1. **Sound tooth.** Text on occlusal anatomy, pulp horns, and enamel thickness over the cusps. Refs: nelson2020, nanci2018.
- [ ] B2. **Early (non-cavitated) enamel lesion.**
  - Subsurface demineralisation under an intact surface layer.
  - Arrest and remineralisation with biofilm control and fluoride.
  - Shown as a white-spot tint and a subsurface enamel lens at 50% of the measured enamel thickness, at the central fossa.
  - Refs: fejerskov2015, featherstone2004, nyvad1999.
- [ ] B3. **Deeper lesion reaching dentin.**
  - The lesion reaches the DEJ, spreads along it, and has outer and inner dentin zones (two shades).
  - The pulpal response may precede bacterial invasion.
  - Surface still intact. Dentin depth is 40% of the measured fissure-to-pulp distance.
  - Refs: fejerskov2015, innes2016, nanci2018.
- [ ] B4. **Advanced cavitated lesion.**
  - Cavity into dentin. Dentin depth is 80% of the fissure-to-pulp distance; cavity at 0.55 of maximum.
  - The text says pulp status must be assessed clinically.
  - Refs: schwendicke2016, ese2019, innes2016.
- [ ] B5. **Cross-sectional comparison.** The same plane and tooth for each stage; only the lesion differs. Refs: fejerskov2015, ismail2007.
- [ ] B6. **Knowledge check stage.** It reuses the advanced-lesion geometry with lettered markers. Refs: schwendicke2016, ese2019, ismail2007, nyvad1999.
- [ ] B7. The sequence is presented as conceptual snapshots, *not* a time-calibrated progression. The disclaimer in the info panel is adequate.
- [ ] B8. Lesion dimensions are educational choices, not measurements. Are the proportions misleading in any stage?

## C. Schematic overlays (`src/three/geometry/lesion.ts`, `src/three/studio/*`)

- [ ] C1. Each lesion is a lens-shaped volume (enamel) plus two nested dentin volumes, placed at the central fossa found on the scanned surface. Acceptable as a schematic?
- [ ] C2. Colours: white-spot `#fbfbf3` (early enamel); enamel lesion `#c79a62`; dentin outer `#b07a3c`; dentin inner `#6b4220`; brown surface staining.
- [ ] C3. The cavity removes tooth structure from the scanned enamel and dentin surfaces (CSG), and the cut faces stay open over the cavity. The cavity shape is schematic.
- [ ] C4. Every overlay is labelled "Carious lesion (schematic)" on the model and listed under "Educational overlay (schematic)" in the panel.
- [ ] C5. The "Lesion overlay (schematic)" toggle hides all overlays, leaving only scanned anatomy.

## D. Knowledge-check questions (`KNOWLEDGE_CHECK`)

| # | Prompt | Keyed answer | OK? |
| --- | --- | --- | --- |
| D1 | Marker A sits in the darker zone below the cavity. Which tissue is it in? | Dentin | [ ] |
| D2 | Marker B marks the break in the occlusal surface. What does it show? | Cavitation: loss of surface integrity opening into dentin | [ ] |
| D3 | Marker C is in the pulp chamber, just under its roof below the lesion. Why does the lesion's closeness to the pulp matter? | Pulp status must be assessed (history, sensibility tests, radiographs) before choosing management | [ ] |
| D4 | Which statement about the early enamel lesion (stage 2) is accurate? | Mineral is lost beneath an intact surface, so the lesion may arrest or remineralise | [ ] |
| D5 | Assigning an ICDAS code to a lesion is an example of… | Classification | [ ] |

- [ ] D6. The explanation for each answer is correct, and the distractors are unambiguously wrong.
- [ ] D7. Markers A–C land on the intended tissue in the app. They are placed from the actual cut-face geometry.
- [ ] D8. The score is labelled formative only, not evidence of competence.

## E. Clinical reasoning vocabulary (`CLINICAL_CONCEPTS`)

- [ ] E1. The distinctions are correct and consistent with the main modules: lesion detection, classification/staging, activity assessment (Nyvad), caries risk assessment, diagnosis (including pulp status), and management.

## F. New anatomy entry (`src/data/anatomy.ts`)

- [ ] F1. **Lamina dura (socket wall).** Function, radiographic appearance, caries relevance, and the clinical note "loss around an apex can be a sign of periapical inflammation". Ref: nanci2018.

## G. Disclaimers and attribution

- [ ] G1. The "not time-calibrated / not diagnostic / not a competence assessment" notice is shown on every stage.
- [ ] G2. The source attribution and the non-commercial licence notice are visible in the info panel.

## H. Caries Quest game (`src/data/game/cariesQuest.ts`)

The game grades management with the reviewed decision pathway (`evaluateDiagnosis`): "consider"
or "refer" = best fit (+150), "may consider" = partial (+75), not listed or "generally not
indicated" = 0. A unit test checks that the keyed option is the only best fit among the four
shown. Detection uses the reviewed ICDAS codes (1 and 2 grouped). New content to review:

| Case | Key findings (summary) | Keyed ICDAS | Keyed management | Other options shown |
| --- | --- | --- | --- | --- |
| Chalky fissure, frequent soft drinks | Chalky opacity visible wet, beyond fissure; intact; no dentin radiolucency; high risk | 1–2 | Sealant / sealing the lesion | Restoration (firm dentin); non-selective removal; monitor |
| Brown, shiny fissure in a low-risk adult | Brown, hard, shiny, confined to fissure; no plaque; no radiolucency | 1–2 | Monitor (arrested lesion) | Restoration; selective removal (soft dentin); endodontic assessment |
| Small break in an opaque fissure | Localised enamel breakdown, no dentin or shadow; enamel radiolucency | 3 | Sealant / sealing the lesion | Monitor; non-selective removal; endodontic assessment |
| Grey shadow under intact enamel | Shadow through intact enamel; middle-third dentin radiolucency; active | 4 | Sealant / sealing the lesion | Restoration (partial credit); monitor; endodontic assessment |
| Food trapping in a cavity | Cavity with dentin visible; middle-third radiolucency; normal pulp | 5 | Restoration with selective removal to firm dentin | Sealant; monitor; endodontic assessment |
| Deep lesion, brief pain with cold | Extensive deep cavity; short cold response; inner-quarter radiolucency | 6 | Selective removal to soft dentin + sealed restoration | Non-selective removal (0); stepwise removal (partial); sealant |
| Deep cavity with night pain | Extensive cavity; spontaneous, lingering pain | 6 | Endodontic assessment and pulp-directed treatment | Selective removal; sealant; monitor |
| Little tooth structure left | Most of crown lost; subgingival caries; non-restorable | 6 | Discuss extraction or specialist opinion | Restoration; sealant; selective removal |

- [ ] H1. Each vignette is clinically coherent and consistent with its keyed ICDAS code.
- [ ] H2. The keyed management is the best teaching answer, and the other options are fair distractors.
- [ ] H3. Keying sealing (rather than restoration) for the non-cavitated ICDAS 4 lesion reaching the middle third of dentin is acceptable, with restoration given partial credit.
- [ ] H4. The scoring, streaks and ranks ("Cariology Ace", "Confident Clinician", "Caries Detective", "Dental Explorer") and the formative-only disclaimer are appropriate.
- [ ] H5. Showing the tooth without plaque ("cleaned and dried") and opening the cross-section after the detection call is appropriate.

---

## Sign-off

| Section | Reviewer (name, qualification) | Date | Decision (approved / changes requested) | Notes |
| --- | --- | --- | --- | --- |
| A | | | | |
| B | | | | |
| C | | | | |
| D | | | | |
| E | | | | |
| F | | | | |
| G | | | | |
| H | | | | |
