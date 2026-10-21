# DentalVerse 3D — Interactive Dental Education Simulator

An interactive 3D teaching application for dental anatomy, caries progression, lesion
classification, treatment planning, cavity preparation and restorative materials. It runs
entirely in the browser: no backend and no API keys. The procedural modules use no external
assets. The **Caries Learning Studio** uses one CBCT-derived tooth model, stored in this
repository and licensed **CC BY-NC 4.0 (non-commercial)**. See §6.

> **Educational simulation only.** DentalVerse 3D is not a diagnostic system, a validated ICDAS
> scoring tool or a validated clinical procedural trainer. The scientific content and references
> of the procedural modules were approved section by section on 2026-10-21 (see §9, Content
> review). The Caries Learning Studio is **`draft_pending_review`**: it has not been reviewed yet
> (see `CLINICAL_REVIEW_CHECKLIST.md`).

---

## 1. Installation and startup

Requirements: Node.js 20 or later (developed with Node 22) and npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and production build to `dist/` |
| `npm run preview` | Serve the production build (default http://localhost:4173) |
| `npm test` | Unit, data-integrity, geometry and UI tests (Vitest + React Testing Library) |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | oxlint |
| `npm run e2e` | Browser acceptance tests (see §4). Needs a running preview server |
| `node tools/assets/build-dental-assets.mjs <3Dentes checkout>` | Rebuild the studio's GLB from the 3Dentes STL files (only needed when changing the asset; the built GLB is committed) |

The studio's model is already in `public/models/dental/`, so no download is needed to run the
app. To rebuild it, clone https://github.com/NateSaindon/3Dentes, read its licence, and run the
command above. Provenance and every modification are recorded in
`public/models/dental/ASSET_CATALOG.md`.

---

## 2. Implemented features

### Application shell
- Left navigation with nine modules; a topic-specific control bar; a central 3D workspace; a
  right-hand information panel ("What is happening?", "Why does it matter?", clinical relevance,
  instruments/materials, step-by-step list, references); and a bottom timeline (play, pause,
  previous, next, reset, speed 0.5–2×, clickable step progress).
- Three learning modes:
  - **Guided learning** — a step banner, the structures for each step highlighted, and the camera
    and section view chosen automatically per step.
  - **Free exploration** — the camera stays where you leave it; anatomy, procedures and materials
    can be selected independently.
  - **Clinical case** — fictional case presentations with interpretation and management
    questions, graded feedback ("most appropriate / acceptable / not appropriate") and a take-away.
- Responsive layout (desktop, tablet, phone) with keyboard-accessible controls, ARIA labels and live
  regions. The colour scheme follows the system light/dark setting.
- Loading states (lazy-loaded 3D engine, procedural model build), an error boundary around the
  scene, a WebGL-unavailable fallback, and messages for unsupported selections.

### Interactive 3D tooth (procedural, built with three.js)
- A simplified mandibular first molar: enamel (a true shell), dentin, pulp chamber with pulp
  horns, two root canals, root dentin, cementum, periodontal ligament, alveolar bone and gingiva.
- Rotate, zoom and pan (mouse or touch); reset the camera; animated camera presets.
- Click any structure (in the 3D view, on a label, or from the chip list) to select and highlight
  it and read its description.
- Toggle labels, gingiva and bone, **cross-section** (the buccal half is clipped and every tissue
  shows a solid cut face), and **normal ↔ pathological** anatomy.

### Caries Learning Studio (3D scan) — `draft_pending_review`
A guided caries lesson on a **real mandibular second molar segmented from a CBCT** (3Dentes,
CC BY-NC 4.0). The enamel, tooth, pulp, PDL and lamina-dura meshes are separate layers from the
source, not colours painted on one mesh.

**Viewer**
- Rotate, zoom, pan, reset and auto-rotate.
- External and cross-section views. Cross-sections are exact plane sections of each scanned layer,
  with outlines.
- Hover and click highlighting. The info panel shows the selected structure with its evidence
  tier (measured or derived).
- Show or hide each layer, and the lesion overlay.
- Loading progress, error (with retry and a fallback to the schematic module), WebGL-unavailable
  and context-lost states.

**Six stages**
1. Sound tooth
2. Early enamel lesion
3. Lesion reaching dentin
4. Advanced cavitated lesion
5. Side-by-side cross-sectional comparison (choose 2–4 stages)
6. Knowledge check with lettered markers placed on the model

The stages are played with the shared timeline (play, pause, replay, next, previous, reset,
speed) or the stage chips.

**Scan versus overlay.** Every stage lists what comes from the scan and what is an
**educational overlay (schematic)**. Lesions are placed at the central fossa and the
fissure-to-pulp distance measured on the scanned tooth, and the cavity is cut out of the scanned
surfaces. Lesion shapes and colours remain schematic.

**Reasoning steps.** Detection, classification, activity, risk, diagnosis and management are
named per stage. A disclaimer states that the stages are not time-calibrated, not diagnostic and
not a competence assessment.

### Module 1 — Dental caries
- Eight stages: normal; biofilm (film with bacteria); acid challenge (animated acid particles going
  in and mineral ions coming out); initial non-cavitated lesion (subsurface cone under an intact
  surface layer, white spot); progressing enamel lesion; dentin involvement (spread along the DEJ,
  micro-cavitation); deep caries; advanced lesion with pulpal involvement.
- The stages change real geometry. Lesion volumes grow, cavitation is cut into the enamel and
  dentin with CSG, the surface discolouration is shaded, and the pulp colour changes. Transitions
  between stages are animated. Every stage has its own explanation, and the panel states that the
  sequence is neither inevitable nor time-calibrated.

### Lesion classification (ICDAS learning mode)
- Five illustrative examples: initial enamel (ICDAS 1–2), moderate enamel (3), cavitated dentinal
  (5), deep dentinal (6), and root caries (with gingival recession). Each comes with an ICDAS code
  summary table and an explicit "not a validated diagnostic tool" notice.

### Diagnosis and treatment planning
- Seven variables: activity, cavitation, depth, symptoms, pulp assessment, caries risk and
  restorability. They drive a rule-based **educational** pathway that lists several options (each
  marked consider / may consider / generally not indicated / assess-refer) with its reasoning and
  references, plus alerts. The 3D lesion updates to match the selections.

### Cavity preparation simulator
- Four procedures: conservative occlusal, Class I, Class II (mesio-occlusal with a proximal box),
  and selective caries removal for deep lesions. Each has eight steps: inspect → objective
  (translucent planned outline) → isolate (rubber dam) → access → removal → result → inspect the
  remaining structure → rationale.
- Tissue is really removed. Constructive solid geometry subtracts the preparation from the enamel,
  the dentin and the lesion. The cut animates progressively, freshly cut walls get their own
  surface material, and selective removal visibly leaves soft dentin over the pulp.
- Instrument choice matters. Unsuitable choices, such as a spoon excavator or a low-speed bur for
  enamel access, or a high-speed bur for removing carious dentin, leave the tooth uncut and explain
  why.
- You can step forwards and backwards, replay, change instruments, inspect from any angle and use
  the **before/after comparison** (two teeth side by side).

### Restorative materials laboratory
- Distinct workflows for each material:
  - **Composite**: etch-and-rinse, self-etch or selective-enamel-etch protocols; etch gel,
    frosty etched enamel, glossy primed and bonded surfaces, light curing with a glow,
    incremental layers (1–3 depending on the preparation), finishing and polishing.
  - **GIC**: conditioning, capsule mixing, bulk placement, a glossy-to-matte acid–base set,
    surface protection.
  - **RMGIC**: dual set (light cure plus continued maturation).
  - **Amalgam**: trituration, condensation increments, carving and burnishing, with a metallic
    finish.
  - **Calcium silicate**: a liner over selectively excavated dentin that sets by hydration, then a
    sealing restoration.
- A matrix band and wedge are added automatically for Class II.
- **Unsupported material/preparation combinations** (for example GIC in Class II, or calcium
  silicate in a shallow preparation) produce a clear explanation and no sequence.
- **Comparison mode** lets you pick any two materials. A structured table compares them, and the
  3D view shows each final restoration in a preparation that suits it.

### Assessment
- 14 quiz questions covering anatomy, caries, classification, procedures and materials. Each
  answer gets immediate feedback with an explanation and its source, a running score is shown, and
  the results screen breaks the score down by topic. It states clearly that a quiz score is not
  evidence of clinical competence.

---

## 3. Architecture

```
src/
  app/App.tsx                  Layout; lazy-loads the 3D scene; guided-mode view sync
  components/
    layout/                    Header (modes), NavPanel, InfoPanel (per-topic dispatcher)
    controls/                  ModuleControls (topic selectors), SceneToolbar, Timeline
    education/                 Anatomy/caries/classification info, procedure & material panels, diagnosis
    assessment/                QuizPanel, CasePanel
  data/                        Scientific content only — no rendering code
    anatomy.ts cariesStages.ts procedures.ts instruments.ts materials.ts
    quiz.ts cases.ts references.ts topics.ts
  modules/diagnosis/           Educational decision engine (pure functions)
  state/
    store.ts                   Central typed Zustand store (topic, mode, structure, step,
                               procedure, instrument, material, protocol, view, quiz…)
    selectors.ts               Pure derivation: state → timeline + ToothVisualState(s) + notices
  three/
    ToothScene.tsx             Canvas, lights, picking, error boundary, WebGL detection
    ToothModel.tsx             One tooth from a ToothVisualState (eased transitions, CSG results)
    AnatomyLayer.tsx           Tissues and periodontium
    CariesLayer.tsx            Lesion volumes, biofilm, acid/ion particles
    RestorativeLayer.tsx       Increments, liner, etch gel, planned-outline ghost
    ClinicalProps.tsx          Rubber dam, cotton rolls, matrix/wedge, instruments, curing light, capsule
    CrossSectionView.tsx       Clipping + back-face "cap" technique for solid cut faces
    SceneControls.tsx          OrbitControls, camera presets, test bridge
    AnatomyLabels.tsx          DOM label overlay projected from the 3D scene
    geometry/                  Procedural anatomy (revolve.ts, anatomy.ts), lesions, CSG cavities,
                               slice.ts (exact plane sections of any mesh: loops, holes, areas)
    studio/                    Viewer for downloaded dental models (Caries Learning Studio)
      DentalModelViewer.tsx    Canvas, camera presets, picking, labels, fallbacks
      dentalModel.ts           GLB loading (meshopt), layer sections, fossa/pulp measurement, anchors
      CariesProgressionController.ts  Stage lesion → overlay volumes, cavity CSG, sections (cached)
      StudioTooth.tsx          Scanned layers with highlight, clipping and lesion tint
      ToothCrossSection.tsx    Flat cut faces with outlines; stencil mask keeps the cavity open
  components/studio/           AnatomyLayerControls, GuidedLessonControls, ClinicalAnnotationPanel,
                               StudioKnowledgeCheck, ModelLoadingFallback
  data/studio/                 assets.ts (asset registry: provenance, licence, layer tiers)
                               cariesLesson.ts (stages, overlays, concepts, knowledge check)
  types/index.ts               Domain types shared by data, state and rendering
  tests/                       Vitest suites
e2e/acceptance.mjs             Real-browser acceptance tests (Playwright + headless Chromium)
tools/assets/                  Reproducible asset pipeline (STL → welded, oriented, compressed GLB)
public/models/dental/          Served model files + ASSET_CATALOG.md (provenance and licences)
```

**Data flow.** UI controls → store → `deriveScene()` (pure and unit-tested) → `ToothVisualState`
→ `ToothModel` → geometry. Every control that changes the state also changes either the visual
state or the learning content, and the selector tests check this.

**Key techniques**
- *Procedural anatomy.* `revolve()` sweeps a closed (r, y) profile with a super-elliptical cross
  section and per-surface height fields (cusps, fossa, grooves, pulp horns). It produces watertight
  indexed solids, which CSG needs. A unit test checks the landmark heights used to place lesions.
- *Cross-section.* A world clipping plane removes the buccal half. Each solid also draws its back
  faces in a flat colour, so the innermost tissue at each point shows as a solid cut face. The
  picking code ignores hits on the clipped half.
- *Tissue removal.* `three-bvh-csg` subtracts the cutter (outline ∪ excavation ∪ cavitation) from
  enamel, dentin and lesion. Restorations are the cutter intersected with the original crown
  contour, sliced into increments. Results are cached by quantised state and evicted (and
  disposed) with an LRU cache.
- *Performance.* `frameloop="demand"`: the scene renders only while something animates or the
  camera moves. The 3D engine loads lazily (main bundle about 107 kB gzipped; 3D chunk about
  283 kB). Geometries and materials are disposed on unmount or eviction.

### Adding a lesson to the Caries Learning Studio
Lessons are data. The viewer, controls, timeline and info panel read them; they are not coded
per lesson.
1. **Stages.** In a data file shaped like `data/studio/cariesLesson.ts`, define `LessonStage`
   objects. Each one needs:
   - an id, title and objective
   - `whatYouSee`, `explanation`, `modelBased` and `illustrative` lists
   - the clinical concepts, the lesion parameters, the section flag, the camera and the focus
     structures
   - `refs` (ids from `data/references.ts`)
   - `verification: 'draft_pending_review'`
2. **Overlays.** Lesion overlays are `LesionVisual` parameters. Their geometry is built at the
   `SiteFrame` that `dentalModel.ts` measures on the scan. For another site (for example a
   proximal or cervical lesion), add a measurement function that returns a `SiteFrame` for that
   site.
3. **Questions.** Add `StudioQuestion`s. A `marker` letter places a label on the model; place it
   from real section geometry, as `stageAnchors` does.
4. **Wiring.** Add a topic id, a `getTimeline` case and a `stepPatch` view rule. Reuse
   `DentalModelViewer`, `AnatomyLayerControls`, `GuidedLessonControls` and
   `ClinicalAnnotationPanel`.
5. **Review.** Add the new content to `CLINICAL_REVIEW_CHECKLIST.md`. It stays a draft until it
   has been reviewed.

**New models.** Follow the rules in `public/models/dental/ASSET_CATALOG.md`, then add a
`DentalAsset`, with node names and an evidence tier per layer. The viewer takes the asset as a
prop.

### Pathway to advanced simulations
The studio separates *measured anatomy* (scanned layers and exact sections), *derived
measurements* (fossa, enamel thickness, pulp distance) and *schematic overlays* (lesions,
cavity). That split is meant to support the following:
- **Restorative and operative steps on the scanned tooth.** `subtractCutter` (CSG) already works
  on the scanned enamel and dentin. Preparation outlines from `geometry/cavity.ts` could be
  placed in the measured `SiteFrame`.
- **Endodontics.** The scanned pulp and canals are real geometry. Access cavities can be cut
  through the measured pulp roof, and canal length can be measured along the pulp mesh.
- **Radiograph-style views.** Summing layer thickness along view rays over exact geometry would
  give a schematic projection to set beside the clinical description.
- **Reviewed lesion models.** Replacing the lens-shaped overlays with a voxel or SDF field,
  driven by an expert-reviewed mineral profile, needs no change to the viewer.

### Adding endodontics and other procedures
1. **Content.** Add `data/endodontics.ts` with `Procedure` objects. Each one needs learning
   objectives, prerequisites, steps, a `visual` patch per step, limitations and references. New
   step visuals may need new `ToothVisualState` fields, for example
   `access: { stage }`, `canalWorkingLength`, `canalShaping: 0–1`, `obturation: 0–1`,
   `apicalLesion`.
2. **Geometry.** The canals are already separate solids (`rootCanal`). An endodontic access cavity
   is a new `CavityShape` with an outline in `geometry/cavity.ts` that CSG removes through the
   pulp-chamber roof. Shaping can scale the canal profile (`canalProfile()`), and obturation can
   render the canal solid with gutta-percha material and a fill clip-plane driven by `obturation`.
   New instruments (files, spreaders, apex locator) go in `data/instruments.ts` with a model in
   `ClinicalProps.tsx`.
3. **State and UI.** Add a topic id in `types` and `data/topics.ts`, a `getTimeline` and
   `deriveScene` case in `selectors.ts`, and an info panel. The timeline, labels, cross-section and
   instruments work without changes.
4. **Decision support.** Extend `decisionEngine.ts`, which already routes irreversible pulpitis and
   necrosis to "endodontic assessment", into a separate endodontic diagnosis pathway.
5. **Tests.** Copy the selector tests ("each step produces a distinct visual") and add a CSG
   geometry test for the access cavity.

---

## 4. Test results (from the final run)

Full, measured results of the studio upgrade are in **`TEST_RESULTS.md`**:
- Unit and UI tests: **14 files, 83 tests**, all passing.
- Browser acceptance: **25/25 checks** passing. That is the 15 original checks plus 11 studio
  checks for loading, camera, picking, layers, stages, comparison, knowledge check, keyboard,
  phone, missing model and no-WebGL.
- Bundle sizes and model-processing timings.

The rest of this section describes the original modules.

**Unit and UI tests (original modules)** — `npm test` at the time: **7 files, 56 tests, all passing**
- `selectors.test.ts`: caries stages are visually distinct and get monotonically deeper; every
  procedure has 8 steps with distinct states; an unsuitable instrument doesn't cut; selective vs
  conventional removal; before/after; composite vs GIC sequences; adhesive protocols; matrix only
  for Class II; incremental vs bulk placement; unsupported combinations; comparison updates; quiz
  scoring.
- `decisionEngine.test.ts`: non-cavitated → non-operative/sealant; inactive → monitor; a deep
  lesion gets a different pathway from a shallow one; irreversible pulpitis → endodontic
  assessment; non-restorable → refer; never a single answer; the 3D lesion tracks depth.
- `store.test.ts`: topic reset, step clamping, replay at the end, prev/next/reset, anatomy tour,
  material fallback, case-mode sync, quiz answer locking and restart.
- `content.test.ts`: every cited reference exists, all content matches the review record, each
  procedure has all required fields, there are at least 10 quiz questions across topics, and every
  case question has a best answer.
- `geometry.test.ts` and `landmarks.test.ts`: closed outward-facing solids; enamel lies above
  dentin, which lies above pulp; CSG gives different geometry at each depth with cut-surface
  groups; restoration increments and liner; fossa, DEJ and pulp-roof landmarks within ±0.3 mm;
  enamel thicker over cusps.
- `app.test.tsx` (scene mocked in jsdom): navigation, structure selection, toolbar toggles, the
  caries stage selector, timeline controls, instrument feedback, composite → GIC switching,
  unsupported combinations, the comparison table, diagnosis pathways, the full quiz flow and
  scoring, and clinical case grading.

**Type-check and build** — `npm run build`: passes.

**Browser acceptance** — `npx vite preview --port 4173 &` then `npm run e2e`. This runs in real
headless Chromium with SwiftShader WebGL. Result: **14/14 checks passed**, covering all 15
acceptance criteria (9 and 10 share one check).

| # | Criterion | Result |
| --- | --- | --- |
| 1 | App starts | ✓ |
| 2 | 3D tooth renders | ✓ non-blank canvas, 76 distinct colours |
| 3 | Rotate, zoom, reset | ✓ drag rotates, wheel zooms, reset restores the preset |
| 4 | Click enamel / dentin / pulp | ✓ real ray-picking in section view, plus the crown in external view |
| 5 | Cross-section | ✓ about 15% of pixels change |
| 6 | Lesion stages change the tooth | ✓ normal→dentin 1.8%, dentin→advanced 7.8% of pixels |
| 7 | Animation controls | ✓ play, pause, next, previous, reset |
| 8 | Distinct preparation states | ✓ pixel changes between steps; before/after; instrument feedback |
| 9/10 | Composite vs GIC sequences | ✓ different step lists; scenes differ by about 46% |
| 11 | Material comparison updates | ✓ table and 3D change |
| 12 | Content matches the selection | ✓ |
| 13 | Quiz scoring | ✓ final score matches the per-question feedback |
| 14 | Small screens | ✓ 390 px phone and 820 px tablet, no horizontal scroll |
| 15 | No console errors | ✓ console clean across the whole run |

Set `CHROMIUM_PATH` if Chromium is not at the default path, and `SCREENSHOT_DIR=./shots` to save
screenshots.

**Lint** — `npm run lint`: 0 errors. 19 warnings remain. Twelve come from React-Compiler-style
immutability rules flagging the usual R3F practice of mutating three.js materials inside
effects/`useFrame`, and seven are fast-refresh "only export components" hints.

---

## 5. Known limitations

- **The anatomy is representative, not validated.** It is a procedural, idealised mandibular first
  molar: four cusps (real teeth usually have five), one canal per root, symmetrical outlines, and
  no adjacent teeth or occlusion. Dimensions are rough textbook averages.
- **Lesions are schematic.** They are smooth lens and cone volumes, not histology. Biofilm, acid
  and ion particles are illustrative. Stage transitions are not time-calibrated.
- **Cutting is geometric, not physical.** Removal uses fixed preparation outlines and quantised
  depths. There is no tool-path-driven or force-based cutting, no tissue hardness model, and no
  retention form for amalgam. Increments are horizontal slices, which simplifies oblique layering.
- **Materials are illustrative.** Material behaviour is shown through representative procedural
  states and appearance (gloss, opacity, metalness, curing glow). It is not a physical simulation
  of shrinkage, setting kinetics or bonding. Comparison values are qualitative.
- **Proximal procedures lack the neighbour tooth.** The adjacent tooth is not modelled, so
  contacts and matrix adaptation are simplified.
- **The decision pathway is rule-based and educational only.** It does not provide clinical
  recommendations.
- **Performance depends on the GPU.** On software-rendered WebGL (as in CI), each CSG step takes
  roughly 100–300 ms, so cutting animations step rather than glide.
- The UI text is in English only.
- **Caries Learning Studio limitations.**
  - The scan is one person's tooth.
  - Enamel thickness is from the literature; PDL and lamina dura are drawn thicker than reality;
    cementum is not resolved.
  - Lesion shapes, colours and cavity outlines are schematic, and a lesion is placed only at the
    central fossa, on the mesiodistal section plane.
  - The scanned tooth surface lies up to about 0.25 mm outside the derived enamel shell in
    places (measured). It is drawn 0.35 mm back in depth so the enamel shows; no vertices are
    moved. A few small dark specks remain on the external enamel surface. Their cause is not
    fully diagnosed.
  - On software-rendered WebGL the studio took about 4.5 s from click to model.
  - The model is **not commercially licensed** (see §6).

## 6. External assets

| Asset | Used by | Source | Licence | Commercial use |
| --- | --- | --- | --- | --- |
| `public/models/dental/lower-molar-47.glb` | Caries Learning Studio | 3Dentes, Nate Saindon (https://github.com/NateSaindon/3Dentes) | CC BY-NC 4.0 | **No** |

The procedural modules need no assets: all their geometry is generated in code, lighting is
generated locally (`RoomEnvironment`), and no fonts, textures, HDRs or models are downloaded.
Nothing is hot-linked at runtime.

The studio model is shown with the attribution "Anatomy from 3Dentes by Nate Saindon,
CC BY-NC 4.0." **Any commercial deployment must remove or replace it**, or obtain permission
from the author. The procedural tooth remains the commercial-safe fallback.

Other evaluated sources, and why they were not used, are in
`public/models/dental/ASSET_CATALOG.md`:
- NIH 3D arches: CC0 but surface only.
- Sketchfab: the model link returned 404, and downloads need a login.

## 7. Recommendations for anatomical realism

1. *(Started in the Caries Learning Studio with a CBCT tooth; non-commercial licence.)* Replace the procedural crown and roots with **segmented micro-CT or CBCT meshes** of real teeth
   (separate enamel, dentin and pulp meshes as watertight solids, decimated to about 20–50k
   triangles), loaded as glTF. Keep the same `ToothGeometries` interface so CSG, section view and
   picking still work, and document where each scan came from and its licence.
2. Add the **fifth (distal) cusp**, a mesial root with two canals (MB/ML), canal curvature,
   isthmuses and furcation anatomy. Add adjacent teeth for contacts and Class II matrices.
3. *(The studio already uses exact plane sections with a stencil mask for the cavity.)* Improve the procedural cut faces with **stencil-buffer capping**, or volumetric (SDF) rendering for lesion
   gradients and translucent zones.
4. Add **physically based enamel** (subsurface scattering or transmission), and use measured
   colour/translucency data for composite shades.
5. Change the lesion model to a **voxel or SDF field** driven by an expert-reviewed
   mineral-density profile. That would allow realistic surface-layer and lesion-body
   representations and tool-path-based excavation.
6. Re-review any content that changes (see §9).

## 8. Scientific references used

Full citations are in `src/data/references.ts` and appear in each information panel.

- Fejerskov O, Nyvad B, Kidd E (eds). *Dental Caries: The Disease and its Clinical Management.* 3rd ed. 2015.
- Pitts NB, et al. Dental caries. *Nat Rev Dis Primers.* 2017;3:17030.
- Featherstone JDB. The continuum of dental caries. *J Dent Res.* 2004;83(Spec Iss C):C39–42.
- Takahashi N, Nyvad B. The role of bacteria in the caries process. *J Dent Res.* 2011;90(3):294–303.
- Marsh PD. Microbial ecology of dental plaque. *Adv Dent Res.* 1994;8(2):263–271.
- Ismail AI, et al. ICDAS. *Community Dent Oral Epidemiol.* 2007;35(3):170–178.
- Nyvad B, Machiulskiene V, Baelum V. Active vs inactive lesions. *Caries Res.* 1999;33(4):252–260.
- Innes NPT, et al. Managing carious lesions: terminology. *Adv Dent Res.* 2016;28(2):49–57.
- Schwendicke F, et al. Managing carious lesions: carious tissue removal. *Adv Dent Res.* 2016;28(2):58–67.
- Duncan HF, et al. ESE position statement: deep caries and the exposed pulp. *Int Endod J.* 2019;52(7):923–934.
- Bjørndal L, et al. Management of deep caries and the exposed pulp. *Int Endod J.* 2019;52(7):949–973.
- Wright JT, et al. Pit-and-fissure sealant guideline. *JADA.* 2016;147(8):672–682.
- Slayton RL, et al. Nonrestorative treatments for carious lesions. *JADA.* 2018;149(10):837–849.
- Nelson SJ. *Wheeler's Dental Anatomy, Physiology and Occlusion.* 11th ed. 2020.
- Nanci A. *Ten Cate's Oral Histology.* 9th ed. 2018.
- Ritter AV, Boushell LW, Walter R. *Sturdevant's Art and Science of Operative Dentistry.* 7th ed. 2019.
- Banerjee A, Watson TF. *Pickard's Guide to Minimally Invasive Operative Dentistry.* 10th ed. 2015.
- Sakaguchi RL, Ferracane JL, Powers JM. *Craig's Restorative Dental Materials.* 14th ed. 2019.
- Ferracane JL. Resin composite — state of the art. *Dent Mater.* 2011;27(1):29–38.
- Van Meerbeek B, et al. From Buonocore's pioneering acid-etch technique to self-adhering restoratives. *J Adhes Dent.* 2020;22(1):7–34.
- Sidhu SK, Nicholson JW. A review of glass-ionomer cements. *J Funct Biomater.* 2016;7(3):16.
- Parirokh M, Torabinejad M. MTA review, Part I. *J Endod.* 2010;36(1):16–27.
- UNEP. *Minamata Convention on Mercury* (2013), Annex A Part II.

No numeric clinical thresholds are given beyond widely taught, explicitly qualified values (for
example "critical pH often quoted around 5.5, varies with fluid composition"; "commonly ≤ 2 mm
increments, follow the manufacturer"). Curing times, etching times and setting times defer to
manufacturer instructions.

## 9. Content review

All ten content sections (anatomy, caries progression, ICDAS classification, treatment-planning
rules, cavity preparation, restorative materials, clinical cases, quiz, references, and
simplifications/disclaimers) were approved without revisions on 2026-10-21. The sign-off is
recorded in the *DentalVerse 3D — Scientific Content Review* document, and in code in
`src/data/review.ts`, which sets every content item to `expert-reviewed`. The app shows
"Expert-reviewed · reviewer · date" beside each reference list.

**Addendum (2026-10-21):** content added after the main review was approved by the same
reviewer: the "Nerve and blood supply" and "Dentinal tubules" anatomy entries, and the magnified
dentin-tubule view (stimuli, response model and hydrodynamic summary). It is listed in
`CONTENT_REVIEW.addenda`.

**Caries Learning Studio — not reviewed.** The studio's stages, overlays, knowledge-check
questions, the "Lamina dura" anatomy entry and the representation of the scanned asset are
`draft_pending_review`. The app shows the draft badge for them. `CLINICAL_REVIEW_CHECKLIST.md`
lists every item to review and has a sign-off table.

**When content changes:** set the edited items' `verification` back to
`'draft_pending_review'` (the app then shows the draft badge for them), get the change
approved, and update `src/data/review.ts`.
