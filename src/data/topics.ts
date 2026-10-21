import type { TopicId } from '../types';

export const TOPICS: { id: TopicId; label: string; short: string }[] = [
  { id: 'anatomy', label: 'Dental anatomy', short: 'Anatomy' },
  { id: 'caries', label: 'Dental caries', short: 'Caries' },
  { id: 'studio', label: 'Caries Learning Studio (3D scan)', short: 'Studio' },
  { id: 'classification', label: 'Lesion classification', short: 'Classification' },
  { id: 'diagnosis', label: 'Diagnosis & treatment planning', short: 'Diagnosis' },
  { id: 'preparation', label: 'Cavity preparation', short: 'Preparation' },
  { id: 'materials', label: 'Restorative materials', short: 'Materials' },
  { id: 'cases', label: 'Clinical cases', short: 'Cases' },
  { id: 'quiz', label: 'Knowledge assessment', short: 'Quiz' },
];
