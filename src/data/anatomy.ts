import { CONTENT_REVIEW } from './review';
import type { AnatomyEntry, StructureId } from '../types';

const REVIEWED = CONTENT_REVIEW.status;

export const ANATOMY: Record<StructureId, AnatomyEntry> = {
  enamel: {
    id: 'enamel',
    name: 'Enamel',
    function:
      'Hard, wear-resistant outer covering of the anatomical crown that bears occlusal load and protects the underlying dentin.',
    characteristics: [
      'Most highly mineralised tissue in the body (predominantly hydroxyapatite-based crystals).',
      'Acellular and non-vital: it cannot regenerate once lost, although mineral can be regained at the crystal level (remineralisation).',
      'Organised in enamel rods (prisms); thickest over cusps, thinnest towards the cemento-enamel junction.',
      'Pits and fissures on the occlusal surface favour biofilm stagnation.',
    ],
    cariesRelevance:
      'The first tissue affected on coronal surfaces. Early lesions are subsurface: mineral is lost beneath a relatively well-mineralised surface layer, which is why early lesions can be arrested or remineralised.',
    clinicalRelevance:
      'Unsupported enamel is brittle. Preparation design aims to preserve sound enamel, and bonded restorations rely on etched enamel for a durable seal.',
    refs: ['nanci2018', 'nelson2020', 'fejerskov2015'],
    verification: REVIEWED,
  },
  dentin: {
    id: 'dentin',
    name: 'Dentin',
    function:
      'Forms the bulk of the tooth, supports the enamel and, together with the pulp, forms the vital dentin–pulp complex.',
    characteristics: [
      'Less mineralised than enamel, with a larger organic (mainly collagen) and water content.',
      'Permeated by dentinal tubules containing odontoblast processes and fluid.',
      'Responds to stimuli: tubular sclerosis and tertiary (reactionary/reparative) dentin can form.',
    ],
    cariesRelevance:
      'Once a lesion reaches dentin it may spread along the dentino-enamel junction and advance towards the pulp. Dentin reacts to the lesion long before bacteria arrive, so the pulp can respond to early dentin involvement.',
    clinicalRelevance:
      'Different zones of carious dentin (soft/infected vs firmer/affected) guide carious tissue removal strategies. Dentin bonding is more technique-sensitive than enamel bonding.',
    refs: ['nanci2018', 'fejerskov2015', 'schwendicke2016'],
    verification: REVIEWED,
  },
  pulp: {
    id: 'pulp',
    name: 'Pulp (coronal pulp chamber)',
    function:
      'Soft connective tissue containing nerves, blood vessels and odontoblasts. It forms dentin, provides sensation and supports tooth vitality.',
    characteristics: [
      'Pulp horns project towards the cusps — relevant when preparing deep cavities.',
      'Enclosed in rigid dentin walls, which limits its capacity to accommodate inflammatory swelling.',
    ],
    cariesRelevance:
      'Pulpal inflammation can begin before bacteria reach the pulp. Whether it is reversible depends on many factors and is assessed clinically — it cannot be read from lesion depth alone.',
    clinicalRelevance:
      'Pulp status (history, sensibility testing, radiographs) strongly influences management of deep caries. Avoiding unnecessary pulp exposure is a key aim of selective caries removal.',
    refs: ['nanci2018', 'ese2019', 'bjorndal2019'],
    verification: REVIEWED,
  },
  rootCanal: {
    id: 'rootCanal',
    name: 'Root canal (radicular pulp)',
    function: 'Continuation of the pulp into each root, communicating with the periodontium at the apical foramen.',
    characteristics: [
      'Mandibular first molars commonly have two canals in the mesial root and one or two in the distal root; this model simplifies to one canal per root.',
      'Canal anatomy is frequently complex (isthmuses, lateral canals).',
    ],
    cariesRelevance:
      'Untreated advanced caries can lead to pulp necrosis and infection of the root canal system, with possible apical periodontitis.',
    clinicalRelevance: 'Root canal treatment addresses infection of this space (planned future endodontics module).',
    refs: ['nelson2020', 'nanci2018'],
    verification: REVIEWED,
  },
  cementum: {
    id: 'cementum',
    name: 'Cementum',
    function: 'Thin mineralised tissue covering the root, into which periodontal ligament fibres insert.',
    characteristics: [
      'Less mineralised than enamel; thin near the CEJ and thicker apically.',
      'Can be lost through abrasion or periodontal treatment, exposing root dentin.',
    ],
    cariesRelevance:
      'Exposed root surfaces (for example after gingival recession) are susceptible to root caries, which can progress in a less-mineralised substrate.',
    clinicalRelevance: 'Root caries is more common in older adults and in people with reduced salivary flow.',
    refs: ['nanci2018', 'fejerskov2015'],
    verification: REVIEWED,
  },
  root: {
    id: 'root',
    name: 'Root dentin',
    function: 'Dentin of the roots that anchors the tooth in its socket via cementum and the periodontal ligament.',
    characteristics: ['Mandibular first molars typically have a mesial and a distal root.'],
    cariesRelevance: 'Becomes involved in root caries once cementum is lost or breached.',
    clinicalRelevance: 'Root form influences restorability, endodontic access and extraction.',
    refs: ['nelson2020'],
    verification: REVIEWED,
  },
  pdl: {
    id: 'pdl',
    name: 'Periodontal ligament',
    function:
      'Fibrous connective tissue that suspends the tooth in the alveolar socket, distributes occlusal forces and provides proprioception.',
    characteristics: ['A narrow space (visible as a thin radiolucent line on radiographs).'],
    cariesRelevance: 'Not directly involved in caries, but apical spread of pulpal infection affects the periapical tissues.',
    clinicalRelevance: 'Widening at the apex on a radiograph can indicate periapical inflammation.',
    refs: ['nanci2018'],
    verification: REVIEWED,
  },
  bone: {
    id: 'bone',
    name: 'Alveolar bone',
    function: 'Bone of the jaw that forms and supports the tooth sockets.',
    characteristics: ['Remodels in response to function and disease.'],
    cariesRelevance: 'Bone loss with periodontal disease and recession may expose root surfaces to root caries risk.',
    clinicalRelevance: 'Bone support influences long-term prognosis of a tooth.',
    refs: ['nanci2018'],
    verification: REVIEWED,
  },
  gingiva: {
    id: 'gingiva',
    name: 'Gingiva',
    function: 'Masticatory mucosa that surrounds the cervical part of the tooth and seals the underlying periodontium.',
    characteristics: ['Free gingival margin sits slightly coronal to the CEJ in health (simplified here).'],
    cariesRelevance: 'Biofilm at the gingival margin drives both gingivitis and cervical/root caries.',
    clinicalRelevance:
      'Gingival health and bleeding affect moisture control — essential for adhesive restorations — and the position of proximal margins.',
    refs: ['nanci2018', 'sturdevant2019'],
    verification: REVIEWED,
  },
  neurovascular: {
    id: 'neurovascular',
    name: 'Nerve and blood supply',
    function:
      'Blood vessels and nerves enter and leave the pulp through the apical foramen (and any accessory canals), supplying the pulp and carrying sensation.',
    characteristics: [
      'Arterioles (red) and venules (blue) run with sensory nerve fibres (yellow) through each root canal into the pulp chamber.',
      'Drawn schematically, as in textbook illustrations; real pulpal vasculature forms a fine capillary network.',
    ],
    cariesRelevance:
      'As a lesion approaches the pulp, pulpal blood flow and nerve activity change; inflammation within the rigid pulp chamber can cause pain.',
    clinicalRelevance:
      'Pulp sensibility tests (e.g., cold testing) assess the nerve response, not the blood supply directly. Interrupted blood supply leads to pulp necrosis.',
    refs: ['nanci2018', 'nelson2020'],
    verification: REVIEWED,
  },
  tubules: {
    id: 'tubules',
    name: 'Dentinal tubules',
    function:
      'Microscopic fluid-filled channels running through the full thickness of dentin from the pulp towards the dentino-enamel junction and the root surface.',
    characteristics: [
      'In coronal dentin they follow a gentle S-shaped course; in the root they run more directly outwards.',
      'Contain dentinal fluid and odontoblast processes; nerve fibres enter the inner part of some tubules.',
      'Tubules are more numerous and wider near the pulp than near the outer dentin.',
    ],
    cariesRelevance:
      'Tubules give acids, bacterial products and bacteria a path towards the pulp; the dentin–pulp complex responds with tubular sclerosis and tertiary dentin.',
    clinicalRelevance:
      'Open tubules on exposed dentin (e.g., after gingival recession or loss of cementum) underlie dentin hypersensitivity. Adhesive bonding to dentin relies on infiltrating the tubules and intertubular dentin.',
    refs: ['nanci2018', 'fejerskov2015'],
    verification: REVIEWED,
  },
  lesion: {
    id: 'lesion',
    name: 'Carious lesion',
    function: 'Not a normal structure: the tissue manifestation of the caries process.',
    characteristics: [
      'Enamel lesion: zone of subsurface mineral loss beneath a surface layer.',
      'Dentin lesion: an outer, more heavily demineralised and contaminated zone and an inner, less affected zone (shown as two shades).',
    ],
    cariesRelevance: 'Lesion activity, cavitation and depth together guide management.',
    clinicalRelevance: 'The 3D lesion here is schematic — real lesions are irregular and are assessed clinically and radiographically.',
    refs: ['fejerskov2015', 'innes2016'],
    verification: REVIEWED,
  },
  biofilm: {
    id: 'biofilm',
    name: 'Dental biofilm (plaque)',
    function: 'Structured microbial community embedded in a matrix on tooth surfaces.',
    characteristics: ['Present on all teeth; its composition and metabolism shift with diet and environment.'],
    cariesRelevance:
      'Frequent sugar intake favours acid-producing and acid-tolerant organisms, shifting the biofilm towards a cariogenic state.',
    clinicalRelevance: 'Disrupting biofilm and reducing sugar frequency are central to caries management.',
    refs: ['marsh1994', 'takahashi2011'],
    verification: REVIEWED,
  },
  restoration: {
    id: 'restoration',
    name: 'Restoration',
    function: 'Restorative material replacing lost tooth structure to restore form, function and cleansability.',
    characteristics: ['Material behaviour depends on the selected material (see Restorative materials).'],
    cariesRelevance: 'A restoration does not cure the caries disease; risk factors still need management.',
    clinicalRelevance: 'Margins are susceptible to secondary/recurrent caries if biofilm control is poor.',
    refs: ['sturdevant2019', 'craig2019'],
    verification: REVIEWED,
  },
  liner: {
    id: 'liner',
    name: 'Calcium silicate liner',
    function: 'Bioactive material placed over deep dentin or a pulp exposure in selected cases.',
    characteristics: ['Sets by hydration; alkaline while setting.'],
    cariesRelevance: 'Used in vital pulp therapy approaches for deep lesions.',
    clinicalRelevance: 'Indications are case-dependent; it is covered by a definitive restoration.',
    refs: ['ese2019', 'parirokh2010'],
    verification: REVIEWED,
  },
};

export const ANATOMY_TOUR: StructureId[] = ['enamel', 'dentin', 'pulp', 'rootCanal', 'neurovascular', 'cementum', 'pdl', 'bone', 'gingiva'];
