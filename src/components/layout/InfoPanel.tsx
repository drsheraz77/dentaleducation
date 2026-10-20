import { useSim } from '../../state/store';
import { AnatomyInfo, CariesInfo, ClassificationInfo } from '../education/TopicInfo';
import { MaterialsInfo, PreparationInfo } from '../education/ProcedureInfo';
import { DiagnosisPanel } from '../education/DiagnosisPanel';
import { CasePanel } from '../assessment/CasePanel';
import { QUIZ } from '../../data/quiz';

function QuizInfo() {
  const topics = [...new Set(QUIZ.map((q) => q.topic))];
  return (
    <div>
      <div className="eyebrow">Knowledge assessment</div>
      <h2>About this quiz</h2>
      <p>
        {QUIZ.length} questions covering {topics.join(', ')}. You get immediate feedback with an explanation and source for each answer, and a summary at
        the end.
      </p>
      <p className="callout">Scores are for self-study only and are not evidence of clinical competence.</p>
    </div>
  );
}

export function InfoPanel() {
  const topic = useSim((s) => s.topic);
  const content = (() => {
    switch (topic) {
      case 'anatomy':
        return <AnatomyInfo />;
      case 'caries':
        return <CariesInfo />;
      case 'classification':
        return <ClassificationInfo />;
      case 'diagnosis':
        return <DiagnosisPanel />;
      case 'preparation':
        return <PreparationInfo />;
      case 'materials':
        return <MaterialsInfo />;
      case 'cases':
        return <CasePanel />;
      case 'quiz':
        return <QuizInfo />;
    }
  })();
  return (
    <aside className="info" aria-label="Information panel">
      {content}
    </aside>
  );
}
