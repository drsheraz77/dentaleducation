# Dental 3D asset catalog

Provenance, licence and suitability of every external 3D asset evaluated for DentalVerse 3D.
All assets the app uses are stored in this folder and served by the app itself. Nothing is
hot-linked from a third-party server at runtime; the browser acceptance test S1 checks this.

Evaluation date for every entry: **2026-10-21**.

---

## In use

### `lower-molar-47.glb` — mandibular right second molar, CBCT-derived (3Dentes)

| Field | Value |
| --- | --- |
| Used by | Caries Learning Studio (`src/data/studio/assets.ts`, id `lower-molar-47`) |
| Source project | 3Dentes — interactive 3D atlas of oral anatomy segmented from one CBCT |
| Original URL | https://github.com/NateSaindon/3Dentes (files under `assets/cbct/stl/`) |
| Version used | commit `d0687f31049d93ad4403181acb2a4868dc49eb03` (2026-09-09) |
| Author | Nate Saindon (the scan is of the author's own dentition, published with his consent) |
| Licence of the anatomy | **CC BY-NC 4.0** — https://creativecommons.org/licenses/by-nc/4.0/ |
| Licence of the 3Dentes code | MIT (not used; only the anatomy meshes were taken) |
| Required attribution | "Anatomy from 3Dentes by Nate Saindon, CC BY-NC 4.0." (shown in the studio's info panel with links to the source and the licence) |
| Commercial use | **Not permitted.** 3Dentes states: "Commercial use is not granted here — ask." |
| Redistribution | Permitted non-commercially with attribution, including in teaching. This folder redistributes a modified version under the same terms. |
| Upstream | Segmentation used the DentalSegmentator pretrained nnU-Net model (CC BY 4.0, https://zenodo.org/records/10829675); 3Dentes states that no ShareAlike term applies. |
| Date accessed | 2026-10-21 |
| Verification status | `draft_pending_review`: how faithfully these meshes represent the tissues has not been reviewed by a qualified person for this project. |

**Source files** (FMA55706 = the tooth's Foundational Model of Anatomy identifier; Universal #31, FDI 47):

| GLB node | Source STL | Triangles in GLB | Evidence tier (as stated by 3Dentes) |
| --- | --- | --- | --- |
| `tooth` | `FMA55706.stl` | 7,998 | **Measured**: outer tooth surface segmented from a 0.16 mm isotropic CBCT. |
| `enamel` | `FMA55706-enamel.stl` | 3,000 | **Derived**: a depth-limited shell whose *extent* is measured and whose *thickness* comes from the literature. |
| `pulp` | `FMA55706-pulp.stl` | 3,500 | **Measured**: traced by hand on the CBCT slices (no threshold separates pulp from dentin at this resolution). |
| `pdl` | `FMA55706-pdl.stl` | 3,000 | **Derived**: measured in position but drawn thicker than in reality (the ligament is about one voxel wide). |
| `lamina` | `FMA55706-lamina.stl` | 3,000 | **Derived**: measured in position, drawn thicker than in reality and continuous around the socket. |

Each tier is shown in the app next to the structure the student selects.

**Modifications made for DentalVerse 3D** (script: `tools/assets/build-dental-assets.mjs`):
1. Selected one tooth (FMA55706) and its enamel, pulp, PDL and lamina-dura meshes.
2. Welded duplicate vertices and computed smooth normals; STL stores only flat facet normals.
3. Applied one rigid transform (rotation and translation only, with no scaling or reshaping) into
   the app frame: +Y occlusal (principal long axis), +X mesial (towards the neighbouring first
   molar, FMA55705), +Z buccal, millimetres, y = 0 at the lowest enamel vertex (≈ CEJ). The
   matrix is recorded in `lower-molar-47.json`.
4. Reordered vertices for cache locality, quantised positions and normals
   (`KHR_mesh_quantization`) and compressed with meshopt (`EXT_meshopt_compression`). File size:
   **142,180 bytes**. The decoder is bundled with three.js; there is no CDN.
5. No vertices were moved and no layers were invented. Dentin is not a separate mesh in the
   source. The app shows "Dentin and root" as the tooth volume, and in section the enamel and
   pulp sections are drawn over it, so the dentin you see is the true remainder.

**Rebuilding**:
```bash
git clone https://github.com/NateSaindon/3Dentes /path/to/3dentes   # read the licence first
node tools/assets/build-dental-assets.mjs /path/to/3dentes
```
This writes `lower-molar-47.glb` and `lower-molar-47.json` here. The build uses
`@gltf-transform/*` 4.5.1 and `meshoptimizer` 1.3.0 (MIT, devDependencies).

**Representational limits**:
- Enamel thickness is from the literature, not measured on this tooth.
- PDL and lamina dura are drawn thicker than reality.
- Cementum is not resolved.
- Canals narrower than about 0.5 mm are below the scan resolution.
- This is one person's tooth, not a population average.

---

## Evaluated, not used

### NIH 3D — 3DPX-003002 "Upper dental tooth model" and 3DPX-003003 "Lower dental tooth model"

| Field | Value |
| --- | --- |
| URLs | https://3d.nih.gov/entries/3002 · https://3d.nih.gov/entries/3DPX-003003 |
| Creator | `mscherer` (created 2016-03-08; published on NIH 3D 2026-10-05) |
| Licence | Public Domain — CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) |
| Content | Full-arch surface models of a patient's maxillary or mandibular teeth on a base (`*_teeth_w_base`). Mesh statistics on the entry pages: about 1.9 M triangles (3002) and about 795 k vertices (3003); the offered files are about 75–183 MB each. |
| Why not used | Surface only: no enamel, dentin or pulp, so internal layers could only be faked by colouring a single mesh, which the brief forbids. Full arches on a base would need heavy segmentation and decimation to isolate one tooth. Kept as the best **commercial-safe** candidate for a future external-morphology or occlusion view. |
| Downloaded | No (only the public entry pages were read). |

### Sketchfab — "Human teeth" and the `dental-anatomy` tag

| Field | Value |
| --- | --- |
| URLs | https://sketchfab.com/3d-models/human-teeth-c4c569f0e08944b0908096aa51b96431 · https://sketchfab.com/tags/dental-anatomy |
| Result | The model URL returned **HTTP 404** on 2026-10-21. Sketchfab downloads require signing in, and per the brief no login or download restriction was bypassed, so no Sketchfab model was evaluated further. |
| Note for later | Each Sketchfab model has its own licence (often CC BY, CC BY-NC, or Standard/Editorial). Check it per model, and record the author and the licence version at download. |

### Blender (https://www.blender.org/)

Not needed for this asset. The 3Dentes meshes were already separated by tissue, so the
conversion was done with a scripted, reproducible open-source pipeline (`@gltf-transform`,
meshoptimizer) instead of manual Blender edits. Blender (GPL; its output files are unrestricted)
remains the right tool if a future asset needs manual separation, retopology or authored
animation. Any such step must be listed under "Modifications".

---

## Rules for adding an asset

1. Read the licence before downloading. Record the URL, author, licence and version, the
   attribution text, whether commercial use is allowed, and the access date.
2. Never commit an asset whose licence forbids redistribution. Never hot-link at runtime.
3. List every modification. Do not reshape anatomy; do not paint layers onto a single mesh.
4. Add a `DentalAsset` entry in `src/data/studio/assets.ts` with each layer's evidence tier and
   `verification: 'draft_pending_review'`.
5. Add the asset to `CLINICAL_REVIEW_CHECKLIST.md` for qualified review.
