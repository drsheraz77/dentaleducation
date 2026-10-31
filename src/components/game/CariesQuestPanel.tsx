import { useEffect, useState } from 'react';
import { useSim } from '../../state/store';
import { GAME_STATUS, ICDAS_BANDS, PATHWAY_TITLES, QUEST_CASE_BY_ID, QUEST_CASES } from '../../data/game/cariesQuest';
import { POINTS, gradeManagement, managementOptions, questRank, questScore, type ManageGrade } from '../../modules/game/cariesQuest';
import { BulletList, References, Section } from '../education/common';

const BEST_KEY = 'dentalverse.cariesQuest.best';

/** The personal best lives only in this browser; the game works without it. */
function readBest(): number | null {
  try {
    const v = window.localStorage.getItem(BEST_KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function saveBest(points: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(points));
  } catch {
    /* storage unavailable: keep playing without a saved best */
  }
}

const GRADE_TEXT: Record<ManageGrade, (fitRefer: boolean) => string> = {
  best: (refer) => (refer ? `Best fit: this needs referral or further assessment (+${POINTS.manage})` : `Best fit for this patient (+${POINTS.manage})`),
  partial: () => `Can be considered, but not the best fit (+${POINTS.managePartial})`,
  wrong: () => 'Not indicated for this patient (+0)',
};

function Intro() {
  const start = useSim((s) => s.startGame);
  const best = readBest();
  return (
    <div>
      <div className="eyebrow">Game · caries detection and management</div>
      <h2>Caries Quest</h2>
      <p>
        {QUEST_CASES.length} simulated patients, in random order. For each one, read the clinical findings and make two calls. The 3D tooth
        is shown cleaned and dried: it shows cavities, and after your detection call it opens in cross-section so you can check the lesion
        depth. Early colour changes are subtle in 3D, as they are in the mouth, so rely on the findings.
      </p>
      <ol>
        <li>
          <strong>Detect</strong> — which ICDAS code fits the visual findings? (+{POINTS.detect})
        </li>
        <li>
          <strong>Manage</strong> — which option fits this patient best? (+{POINTS.manage}, or +{POINTS.managePartial} for an option that can be
          considered but is not the best fit)
        </li>
      </ol>
      <p>Get both right in a row to build a streak: each extra perfect case adds up to +{POINTS.streakMax} bonus points.</p>
      {best !== null && <p data-testid="quest-best">Your best score in this browser: {best}</p>}
      <button type="button" className="btn" onClick={() => start()}>
        Start game
      </button>
      <p className="callout" style={{ marginTop: 16 }}>
        Fictional cases for self-study. Scores are formative feedback, not evidence of clinical competence.
      </p>
      <References ids={['ismail2007', 'schwendicke2016', 'ese2019']} verification={GAME_STATUS} />
    </div>
  );
}

function Round() {
  const game = useSim((s) => s.game);
  const detect = useSim((s) => s.answerGameDetect);
  const manage = useSim((s) => s.answerGameManage);
  const next = useSim((s) => s.nextGameCase);
  const c = QUEST_CASE_BY_ID[game.order[game.index]];
  const a = game.answers[c.id] ?? {};
  const options = managementOptions(c);
  const chosen = a.manage ? gradeManagement(c, a.manage) : null;
  const keyed = gradeManagement(c, c.keyed);
  const last = game.index === game.order.length - 1;
  return (
    <div>
      <div className="eyebrow">
        Case {game.index + 1} of {game.order.length} · simulated
      </div>
      <h2>{c.title}</h2>
      <p>{c.patient}</p>
      <Section title="Findings">
        <BulletList items={c.findings} />
      </Section>

      <Section title="Step 1 · Detect: which ICDAS code fits the visual findings?">
        <div className="option-list" role="group" aria-label="ICDAS code">
          {ICDAS_BANDS.map((b) => {
            const done = a.detect !== undefined;
            const cls = done ? (b.band === c.icdas ? ' option--correct' : b.band === a.detect ? ' option--wrong' : '') : '';
            return (
              <button key={b.band} type="button" className={`option${cls}`} disabled={done} onClick={() => detect(c.id, b.band)}>
                {b.label}
              </button>
            );
          })}
        </div>
        {a.detect !== undefined && (
          <p className={`callout ${a.detect === c.icdas ? 'callout--ok' : 'callout--bad'}`} role="status">
            <strong>{a.detect === c.icdas ? `Correct (+${POINTS.detect}).` : 'Not quite.'}</strong> {c.detectionNote} The 3D view now shows the cross-section.
          </p>
        )}
      </Section>

      {a.detect !== undefined && (
        <Section title="Step 2 · Manage: which option fits this patient best?">
          <div className="option-list" role="group" aria-label="Management">
            {options.map((id) => {
              const done = a.manage !== undefined;
              const g = done ? gradeManagement(c, id).grade : null;
              const cls = done && (id === a.manage || id === c.keyed) ? (g === 'best' ? ' option--correct' : g === 'partial' ? ' option--acceptable' : ' option--wrong') : '';
              return (
                <button key={id} type="button" className={`option${cls}`} disabled={done} onClick={() => manage(c.id, id)}>
                  {PATHWAY_TITLES[id]}
                </button>
              );
            })}
          </div>
          {chosen && (
            <div className={`callout ${chosen.grade === 'best' ? 'callout--ok' : chosen.grade === 'partial' ? 'callout--info' : 'callout--bad'}`} role="status">
              <strong>{GRADE_TEXT[chosen.grade](chosen.fit === 'refer')}.</strong>
              {chosen.pathway ? (
                <BulletList items={chosen.pathway.reasoning} />
              ) : (
                <p style={{ margin: '6px 0 0' }}>The decision pathway does not list this option for these findings.</p>
              )}
              {chosen.grade !== 'best' && keyed.pathway && (
                <>
                  <p style={{ margin: '8px 0 0' }}>
                    <strong>Best fit:</strong> {keyed.pathway.title}
                  </p>
                  <BulletList items={keyed.pathway.reasoning} />
                </>
              )}
            </div>
          )}
          {chosen && <References ids={keyed.pathway?.refs ?? []} verification={GAME_STATUS} />}
        </Section>
      )}

      {a.manage !== undefined && (
        <button type="button" className="btn" onClick={next}>
          {last ? 'See results' : 'Next case →'}
        </button>
      )}
    </div>
  );
}

function Results() {
  const game = useSim((s) => s.game);
  const start = useSim((s) => s.startGame);
  const score = questScore(game.order, game.answers);
  const rank = questRank(score.points, score.max);
  const [previousBest] = useState(readBest);
  const newBest = previousBest === null || score.points > previousBest;
  useEffect(() => {
    if (newBest) saveBest(score.points);
  }, [newBest, score.points]);
  const detected = score.rounds.filter((r) => r.detectCorrect).length;
  const managed = score.rounds.filter((r) => r.manage === 'best').length;
  return (
    <div>
      <div className="eyebrow">Caries Quest · results</div>
      <h2>{rank.title}</h2>
      <p className="quest-score" data-testid="quest-final">
        {score.points} <small>/ {score.max} points</small>
      </p>
      {newBest && previousBest !== null && <p className="callout callout--ok">New personal best (previous: {previousBest}).</p>}
      <p>{rank.message}</p>
      <ul>
        <li>
          Detection: {detected} of {score.rounds.length} correct
        </li>
        <li>
          Management: {managed} of {score.rounds.length} best fit
        </li>
        <li>Longest perfect streak: {score.bestStreak}</li>
      </ul>
      <Section title="Case by case">
        <ol>
          {score.rounds.map((r) => (
            <li key={r.caseId}>
              {QUEST_CASE_BY_ID[r.caseId].title}: {r.detectCorrect ? 'ICDAS ✓' : 'ICDAS ✗'}, management{' '}
              {r.manage === 'best' ? '✓' : r.manage === 'partial' ? '½' : '✗'} — {r.points} pts
            </li>
          ))}
        </ol>
      </Section>
      <button type="button" className="btn" onClick={() => start()}>
        Play again
      </button>
      <p className="callout" style={{ marginTop: 16 }}>
        Formative self-study only, not evidence of clinical competence. To improve, revisit Lesion classification and Diagnosis &amp; treatment
        planning.
      </p>
      <References ids={['ismail2007', 'schwendicke2016', 'ese2019']} verification={GAME_STATUS} />
    </div>
  );
}

/** Caries Quest: detection (ICDAS) and management decisions on simulated cases, with points and streaks. */
export function CariesQuestPanel() {
  const game = useSim((s) => s.game);
  if (!game.started) return <Intro />;
  if (game.index >= game.order.length) return <Results />;
  return <Round />;
}

/** Compact scoreboard for the control bar. */
export function CariesQuestScoreboard() {
  const game = useSim((s) => s.game);
  const start = useSim((s) => s.startGame);
  const score = questScore(game.order, game.answers);
  if (!game.started) return <span className="control">Press “Start game” in the game panel to begin.</span>;
  const finished = game.index >= game.order.length;
  return (
    <div className="quest-board" aria-live="polite">
      <span>
        Case <strong>{Math.min(game.index + 1, game.order.length)}</strong>/{game.order.length}
      </span>
      <span data-testid="quest-points">
        Score <strong>{score.points}</strong>
      </span>
      <span>
        Streak <strong>{score.streak}</strong>
      </span>
      <div className="quest-progress" aria-hidden>
        <i style={{ width: `${(score.completed / game.order.length) * 100}%` }} />
      </div>
      <button type="button" className="chip" onClick={() => start()}>
        {finished ? 'Play again' : 'Restart'}
      </button>
    </div>
  );
}
