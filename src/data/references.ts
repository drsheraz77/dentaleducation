import type { Reference } from '../types';

/**
 * Source list: established textbooks, consensus statements and guidelines.
 * Approved in the content review recorded in ./review.ts. No DOIs are given.
 */
export const REFERENCES: Reference[] = [
  {
    id: 'fejerskov2015',
    citation:
      'Fejerskov O, Nyvad B, Kidd E (eds). Dental Caries: The Disease and its Clinical Management. 3rd ed. Wiley Blackwell; 2015.',
    type: 'textbook',
    supports: ['caries', 'classification', 'diagnosis'],
  },
  {
    id: 'pitts2017',
    citation: 'Pitts NB, Zero DT, Marsh PD, et al. Dental caries. Nature Reviews Disease Primers. 2017;3:17030.',
    type: 'journal',
    supports: ['caries', 'diagnosis'],
  },
  {
    id: 'featherstone2004',
    citation:
      'Featherstone JDB. The continuum of dental caries — evidence for a dynamic disease process. Journal of Dental Research. 2004;83(Spec Iss C):C39–C42.',
    type: 'journal',
    supports: ['caries'],
  },
  {
    id: 'takahashi2011',
    citation:
      'Takahashi N, Nyvad B. The role of bacteria in the caries process: ecological perspectives. Journal of Dental Research. 2011;90(3):294–303.',
    type: 'journal',
    supports: ['caries'],
  },
  {
    id: 'marsh1994',
    citation:
      'Marsh PD. Microbial ecology of dental plaque and its significance in health and disease. Advances in Dental Research. 1994;8(2):263–271.',
    type: 'journal',
    supports: ['caries'],
  },
  {
    id: 'ismail2007',
    citation:
      'Ismail AI, Sohn W, Tellez M, et al. The International Caries Detection and Assessment System (ICDAS): an integrated system for measuring dental caries. Community Dentistry and Oral Epidemiology. 2007;35(3):170–178.',
    type: 'journal',
    supports: ['classification'],
  },
  {
    id: 'nyvad1999',
    citation:
      'Nyvad B, Machiulskiene V, Baelum V. Reliability of a new caries diagnostic system differentiating between active and inactive caries lesions. Caries Research. 1999;33(4):252–260.',
    type: 'journal',
    supports: ['classification', 'diagnosis'],
  },
  {
    id: 'innes2016',
    citation:
      'Innes NPT, Frencken JE, Bjørndal L, et al. Managing carious lesions: consensus recommendations on terminology. Advances in Dental Research. 2016;28(2):49–57.',
    type: 'consensus',
    supports: ['diagnosis', 'preparation'],
  },
  {
    id: 'schwendicke2016',
    citation:
      'Schwendicke F, Frencken JE, Bjørndal L, et al. Managing carious lesions: consensus recommendations on carious tissue removal. Advances in Dental Research. 2016;28(2):58–67.',
    type: 'consensus',
    supports: ['diagnosis', 'preparation'],
  },
  {
    id: 'ese2019',
    citation:
      'Duncan HF, Galler KM, Tomson PL, et al. European Society of Endodontology position statement: management of deep caries and the exposed pulp. International Endodontic Journal. 2019;52(7):923–934.',
    type: 'guideline',
    supports: ['diagnosis', 'preparation', 'materials'],
  },
  {
    id: 'bjorndal2019',
    citation:
      'Bjørndal L, Simon S, Tomson PL, Duncan HF. Management of deep caries and the exposed pulp. International Endodontic Journal. 2019;52(7):949–973.',
    type: 'journal',
    supports: ['diagnosis', 'preparation', 'materials'],
  },
  {
    id: 'wright2016',
    citation:
      'Wright JT, Crall JJ, Fontana M, et al. Evidence-based clinical practice guideline for the use of pit-and-fissure sealants. Journal of the American Dental Association. 2016;147(8):672–682.',
    type: 'guideline',
    supports: ['diagnosis'],
  },
  {
    id: 'slayton2018',
    citation:
      'Slayton RL, Urquhart O, Araujo MWB, et al. Evidence-based clinical practice guideline on nonrestorative treatments for carious lesions. Journal of the American Dental Association. 2018;149(10):837–849.',
    type: 'guideline',
    supports: ['diagnosis'],
  },
  {
    id: 'nelson2020',
    citation: "Nelson SJ. Wheeler's Dental Anatomy, Physiology and Occlusion. 11th ed. Elsevier; 2020.",
    type: 'textbook',
    supports: ['anatomy'],
  },
  {
    id: 'nanci2018',
    citation: "Nanci A. Ten Cate's Oral Histology: Development, Structure, and Function. 9th ed. Elsevier; 2018.",
    type: 'textbook',
    supports: ['anatomy', 'caries'],
  },
  {
    id: 'sturdevant2019',
    citation:
      "Ritter AV, Boushell LW, Walter R (eds). Sturdevant's Art and Science of Operative Dentistry. 7th ed. Elsevier; 2019.",
    type: 'textbook',
    supports: ['preparation', 'materials'],
  },
  {
    id: 'banerjee2015',
    citation:
      "Banerjee A, Watson TF. Pickard's Guide to Minimally Invasive Operative Dentistry. 10th ed. Oxford University Press; 2015.",
    type: 'textbook',
    supports: ['preparation', 'diagnosis', 'materials'],
  },
  {
    id: 'craig2019',
    citation:
      "Sakaguchi RL, Ferracane JL, Powers JM (eds). Craig's Restorative Dental Materials. 14th ed. Elsevier; 2019.",
    type: 'textbook',
    supports: ['materials'],
  },
  {
    id: 'ferracane2011',
    citation: 'Ferracane JL. Resin composite — state of the art. Dental Materials. 2011;27(1):29–38.',
    type: 'journal',
    supports: ['materials'],
  },
  {
    id: 'vanmeerbeek2020',
    citation:
      "Van Meerbeek B, Yoshihara K, Van Landuyt K, Yoshida Y, Peumans M. From Buonocore's pioneering acid-etch technique to self-adhering restoratives. Journal of Adhesive Dentistry. 2020;22(1):7–34.",
    type: 'journal',
    supports: ['materials'],
  },
  {
    id: 'sidhu2016',
    citation:
      'Sidhu SK, Nicholson JW. A review of glass-ionomer cements for clinical dentistry. Journal of Functional Biomaterials. 2016;7(3):16.',
    type: 'journal',
    supports: ['materials'],
  },
  {
    id: 'parirokh2010',
    citation:
      'Parirokh M, Torabinejad M. Mineral trioxide aggregate: a comprehensive literature review — Part I: chemical, physical, and antibacterial properties. Journal of Endodontics. 2010;36(1):16–27.',
    type: 'journal',
    supports: ['materials'],
  },
  {
    id: 'minamata2013',
    citation:
      'United Nations Environment Programme. Minamata Convention on Mercury (adopted 2013; Annex A, Part II: phase-down of dental amalgam).',
    type: 'treaty',
    supports: ['materials'],
  },
];

const byId = new Map(REFERENCES.map((r) => [r.id, r]));

export function getReference(id: string): Reference | undefined {
  return byId.get(id);
}

export function referencesFor(ids: string[]): Reference[] {
  return [...new Set(ids)].map((id) => byId.get(id)).filter((r): r is Reference => !!r);
}
