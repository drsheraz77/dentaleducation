import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSim } from '../state/store';
import { QUIZ } from '../data/quiz';

const get = () => useSim.getState();

beforeEach(() => {
  useSim.setState(initialState);
});

describe('simulation store', () => {
  it('resets the step and stops playback when the topic changes', () => {
    get().setTopic('caries');
    get().setStep(4);
    get().play();
    expect(get().playing).toBe(true);
    get().setTopic('preparation');
    expect(get().step).toBe(0);
    expect(get().playing).toBe(false);
  });

  it('clamps steps to the timeline and stops at the end', () => {
    get().setTopic('caries');
    get().setStep(99);
    expect(get().step).toBe(7);
    get().setStep(6);
    get().play();
    get().nextStep();
    expect(get().step).toBe(7);
    expect(get().playing).toBe(true);
    get().nextStep(); // playback past the last step stops
    expect(get().playing).toBe(false);
    expect(get().step).toBe(7);
  });

  it('replays from the start when play is pressed on the last step', () => {
    get().setTopic('caries');
    get().setStep(7);
    get().play();
    expect(get().step).toBe(0);
    expect(get().playing).toBe(true);
  });

  it('prev/next/reset move through the steps', () => {
    get().setTopic('preparation');
    get().nextStep();
    get().nextStep();
    expect(get().step).toBe(2);
    get().prevStep();
    expect(get().step).toBe(1);
    get().reset();
    expect(get().step).toBe(0);
  });

  it('anatomy tour steps select the described structure', () => {
    get().setTopic('anatomy');
    get().setStep(2);
    expect(get().selectedStructure).toBe('pulp');
  });

  it('switching to a material that does not support the preparation falls back to its default', () => {
    get().setTopic('materials');
    get().setMaterialPreparation('class-ii');
    get().setMaterial('gic');
    expect(get().materialPreparation).toBe('class-i');
    get().setMaterial('calciumSilicate');
    expect(get().materialPreparation).toBe('selective-removal');
  });

  it('clinical case mode and topic stay in sync', () => {
    get().setMode('case');
    expect(get().topic).toBe('cases');
    get().setTopic('materials');
    expect(get().mode).toBe('explore');
  });

  it('records quiz answers once and finishes after the last question', () => {
    const q0 = QUIZ[0];
    get().answerQuiz(q0.correctIndex);
    get().answerQuiz((q0.correctIndex + 1) % q0.options.length); // ignored: already answered
    expect(get().quiz.answers[0]).toBe(q0.correctIndex);
    for (let i = 0; i < QUIZ.length; i++) {
      if (get().quiz.answers[get().quiz.index] === null) get().answerQuiz(0);
      get().nextQuestion();
    }
    expect(get().quiz.finished).toBe(true);
    get().restartQuiz();
    expect(get().quiz.finished).toBe(false);
    expect(get().quiz.answers.every((a) => a === null)).toBe(true);
  });
});
