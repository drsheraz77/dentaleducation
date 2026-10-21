# Test results — Caries Learning Studio upgrade

Measured on 2026-10-21 in the Claude Code cloud container: Linux, Node v22.22.0, headless
Chromium 141.0.7390.37 with **SwiftShader (software) WebGL**, so there was no GPU. Every number below
was produced by the commands shown; none are estimates. Timings on a machine with a GPU will
differ.

## 1. Type-check, build and lint

| Command | Result |
| --- | --- |
| `npx tsc -b` | passes, no errors |
| `npm run build` | passes |
| `npm run lint` (oxlint) | **0 errors**, 29 warnings. The warnings are the same kinds as before: R3F material mutation in effects, fast-refresh "only export components" hints, and two `set-state-in-effect` hints for the model loader and the stage-change highlight timer. |

Production bundle (`npm run build`):

| File | Size | gzip |
| --- | --- | --- |
| `index-*.js` (UI shell, data, store) | 388.17 kB | 116.98 kB |
| `ToothScene-*.js` (three.js, R3F, CSG; lazy) | 1,049.49 kB | 286.45 kB |
| `DentalModelViewer-*.js` (studio viewer, GLTF + meshopt decoder; lazy) | 89.24 kB | 27.71 kB |
| `index-*.css` | 16.11 kB | 4.30 kB |
| `models/dental/lower-molar-47.glb` | 142,180 B | (already compressed) |

## 2. Unit, data and UI tests — `npm test`

**14 files, 83 tests, all passing** (about 11 s).

| File | Tests | What it checks |
| --- | --- | --- |
| `studio.test.tsx` *(new)* | 13 | See the list below |
| `dentalAsset.test.ts` *(new)* | 1 | The GLB decodes in Node with the meshopt decoder; it has the 5 named layers; world bounds are in the expected frame |
| `slice.test.ts` *(new)* | 3 | Exact plane sections: a box (area exact), a torus (hole detected), and the real tooth layers |
| `dentalModel.test.ts` *(new)* | 2 | Fossa, enamel thickness and fissure-to-pulp distance measured on the scan are in a plausible range; every tissue gets a label anchor inside its own cut face |
| `app.test.tsx` | 13 | Existing UI flows (unchanged and still passing) |
| `content.test.ts` | 7 | Every cited reference exists, and the review record matches the content. Now expects exactly one draft anatomy entry (`lamina`). |
| `selectors.test.ts`, `store.test.ts`, `decisionEngine.test.ts`, `geometry.test.ts`, `landmarks.test.ts`, `textbook.test.ts`, `tubules.test.ts`, `dentinTubules.test.ts` | 44 | Existing suites, unchanged and passing |

`studio.test.tsx` covers:
- The six stages, in order, are all `draft_pending_review`.
- Every stage separates model-based from illustrative content.
- Every cited reference exists.
- Lesion severity increases monotonically.
- The knowledge-check questions are well formed, with unique markers, and `studioScore` is correct.
- Each asset records its URL, author, licence, licence URL, attribution, access date and modifications; its path is local; commercial use is `false`.
- Each stage opens in its own view.
- The comparison keeps at least two stages, in order.
- Knowledge-check answers lock.
- In the UI:
  - The toolbar hides "Gingiva & bone" and shows "Auto-rotate".
  - Layer toggles, the cross-section and stage chips drive the viewer state.
  - The cross-section toggle is locked on the comparison stage.
  - The comparison chips work.
  - The knowledge check gives feedback and a score.
  - The info panel shows the attribution, the CC BY-NC notice and the draft badge.

Measured section areas of the scanned tooth (from `slice.test.ts`, on the mesiodistal plane z = 0):

| Layer | Area |
| --- | --- |
| tooth | 162.8 mm² |
| enamel | 19.5 mm² |
| pulp | 26.4 mm² |
| PDL | 25.6 mm² |
| lamina | 20.4 mm² |

Measured on the scan (from `dentalModel.test.ts`):
- Central fossa at (−1.14, 8.08, 0) mm.
- Occlusal enamel 1.48 mm thick.
- 5.02 mm from the DEJ under the fossa to the pulp roof.

## 3. Browser acceptance tests — `npm run e2e`

```bash
npm run build && npx vite preview --port 4173 &
node e2e/acceptance.mjs http://localhost:4173
```

**Result: 25/25 checks passed** in the final run, and in both runs after the last code change.

| # | Check | Measured result |
| --- | --- | --- |
| 1–15 | Existing modules (unchanged checks) | All pass: app starts; procedural tooth renders; rotate, zoom, reset; picking; section; lesion stages; animation controls; preparation steps; composite vs GIC; material comparison; content sync; quiz scoring; phone and tablet layouts; console clean |
| S1 | Studio loads the local GLB, with no third-party requests | Model on screen **4,520 ms** after clicking the module in the final run (range across four runs: 4,492–4,894 ms). GLB transfer 142,480 B in 6–16 ms. |
| S2 | Rotate, zoom, reset, auto-rotate | Drag rotates, the wheel zooms in, and reset returns within 0.5 mm of the preset. Auto-rotate moves the camera. |
| S3 | Hover and click picking on the scan | Hover changes the highlighted tissue's pixels; clicking selects enamel → dentin → pulp, and the info panel follows |
| S4 | Layer toggles | Hiding enamel changes 1.9% of sampled pixels; showing the PDL changes 2.8% |
| S5 | Stage navigation, label and info sync | Next/previous/play/pause work; the timeline title and info heading match; the "Carious lesion (schematic)" label is present; every stage renders differently |
| S6 | Comparison stage | 3 captions by default → 4 after adding "Sound"; the cross-section toggle is locked |
| S7 | Knowledge check | Markers A, B and C are shown; a right answer gets "Correct.", a wrong one is counted; score "1 / 2 answered" |
| S8 | Keyboard | Tab + Enter on stage chips, Space on "Next step", Enter on the toolbar |
| S9 | Phone (390 × 844) | Canvas 390 × 520 px, no horizontal scroll |
| S10 | Missing model (GLB 404) | Error message shown, no 3D toolbar; "Try again" loads the model once the file is reachable; "Open the schematic caries module instead" switches module |
| S11 | No WebGL (`getContext` returns null) | Fallback message shown; the lesson text and stage navigation still work; no page errors |

**Flakiness observed during development:** check 3 (procedural camera reset) failed once out of
six runs. It was off by 1.19 mm. It passed in every later run; the cause was not identified.
Auto-rotate (S2) was flaky until it was made time-based (see the code change in
`SceneControls.tsx`).

## 4. Processing cost of the scanned model (Node, same container)

Measured with a temporary timing script calling the same functions the browser uses:

| Step | Time |
| --- | --- |
| GLB parse and decode | 10 ms |
| Exact sections of the 5 layers | 75 ms |
| Fossa and pulp measurement (ray casts) | 29 ms |
| Section label anchors | 100 ms |
| External label anchors | 8 ms |
| **Total `processModel`** | **139 ms** |
| Cavity CSG for the advanced stage (enamel + tooth, first time; cached afterwards) | 209 ms |

Most of the 4.5 s in S1 is therefore loading the lazy chunk and compiling shaders under software
WebGL, not model processing.

## 5. Not tested

- Real GPUs, Safari/Firefox, and touch gestures on physical devices.
- Screen-reader output (only ARIA roles and names were checked).
- Clinical accuracy: tests cannot validate it. See `CLINICAL_REVIEW_CHECKLIST.md`.
