/**
 * @file        Scoring Service Tests
 * @description Unit tests for the per-question-type scoring engine
 */

import { QuestionType } from '@prisma/client';
import { scoreQuestion, calculateTotalScore } from '@/services/scoringService';

// =============================================================================
// scoreQuestion - null / undefined / unknown type
// =============================================================================

describe('scoreQuestion', () => {
  describe('null/undefined responses', () => {
    it('returns score 0 for null response', () => {
      const result = scoreQuestion(QuestionType.TRUE_FALSE, null, { value: true });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('returns score 0 for undefined response', () => {
      const result = scoreQuestion(QuestionType.TRUE_FALSE, undefined, { value: true });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });
  });

  // ===========================================================================
  // MULTIPLE_CHOICE_SINGLE
  // ===========================================================================

  describe('MULTIPLE_CHOICE_SINGLE', () => {
    const type = QuestionType.MULTIPLE_CHOICE_SINGLE;

    it('scores correct answer as 1', () => {
      const result = scoreQuestion(type, { optionId: 'a' }, { optionId: 'a' });
      expect(result).toEqual({ score: 1, isCorrect: true });
    });

    it('scores wrong answer as 0', () => {
      const result = scoreQuestion(type, { optionId: 'b' }, { optionId: 'a' });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('scores missing optionId as 0', () => {
      const result = scoreQuestion(type, {}, { optionId: 'a' });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('scores missing correct answer optionId as 0', () => {
      const result = scoreQuestion(type, { optionId: 'a' }, {});
      expect(result).toEqual({ score: 0, isCorrect: false });
    });
  });

  // ===========================================================================
  // MULTIPLE_CHOICE_MULTI
  // ===========================================================================

  describe('MULTIPLE_CHOICE_MULTI', () => {
    const type = QuestionType.MULTIPLE_CHOICE_MULTI;

    it('scores all correct selections as 1', () => {
      const result = scoreQuestion(
        type,
        { optionIds: ['a', 'b'] },
        { optionIds: ['a', 'b'] }
      );
      expect(result.score).toBe(1);
      expect(result.isCorrect).toBe(true);
    });

    it('awards fractional credit for partial correct', () => {
      const result = scoreQuestion(
        type,
        { optionIds: ['a'] },
        { optionIds: ['a', 'b'] }
      );
      expect(result.score).toBeCloseTo(0.5);
      expect(result.isCorrect).toBe(false);
    });

    it('penalizes wrong selections', () => {
      const result = scoreQuestion(
        type,
        { optionIds: ['a', 'c'] },
        { optionIds: ['a', 'b'] }
      );
      // +0.5 for a, -0.5 for c = 0
      expect(result.score).toBeCloseTo(0);
      expect(result.isCorrect).toBe(false);
    });

    it('clamps negative score to 0', () => {
      const result = scoreQuestion(
        type,
        { optionIds: ['c', 'd'] },
        { optionIds: ['a', 'b'] }
      );
      expect(result.score).toBe(0);
      expect(result.isCorrect).toBe(false);
    });

    it('deduplicates user selections', () => {
      const result = scoreQuestion(
        type,
        { optionIds: ['a', 'a', 'a'] },
        { optionIds: ['a', 'b'] }
      );
      // Only counts 'a' once: +0.5
      expect(result.score).toBeCloseTo(0.5);
    });

    it('returns 0 for empty selections', () => {
      const result = scoreQuestion(
        type,
        { optionIds: [] },
        { optionIds: ['a', 'b'] }
      );
      expect(result.score).toBe(0);
    });

    it('returns 0 for non-array optionIds', () => {
      const result = scoreQuestion(
        type,
        { optionIds: 'a' },
        { optionIds: ['a'] }
      );
      expect(result.score).toBe(0);
    });

    it('returns 0 for empty correct answer', () => {
      const result = scoreQuestion(
        type,
        { optionIds: ['a'] },
        { optionIds: [] }
      );
      expect(result.score).toBe(0);
    });
  });

  // ===========================================================================
  // TRUE_FALSE
  // ===========================================================================

  describe('TRUE_FALSE', () => {
    const type = QuestionType.TRUE_FALSE;

    it('scores correct true answer', () => {
      const result = scoreQuestion(type, { value: true }, { value: true });
      expect(result).toEqual({ score: 1, isCorrect: true });
    });

    it('scores correct false answer', () => {
      const result = scoreQuestion(type, { value: false }, { value: false });
      expect(result).toEqual({ score: 1, isCorrect: true });
    });

    it('scores wrong answer', () => {
      const result = scoreQuestion(type, { value: true }, { value: false });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('returns 0 for non-boolean value', () => {
      const result = scoreQuestion(type, { value: 'true' }, { value: true });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('returns 0 for missing value', () => {
      const result = scoreQuestion(type, {}, { value: true });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });
  });

  // ===========================================================================
  // DRAG_ORDER
  // ===========================================================================

  describe('DRAG_ORDER', () => {
    const type = QuestionType.DRAG_ORDER;

    it('scores exact order match as correct', () => {
      const result = scoreQuestion(
        type,
        { orderedIds: ['a', 'b', 'c'] },
        { orderedIds: ['a', 'b', 'c'] }
      );
      expect(result).toEqual({ score: 1, isCorrect: true });
    });

    it('scores wrong order as incorrect', () => {
      const result = scoreQuestion(
        type,
        { orderedIds: ['b', 'a', 'c'] },
        { orderedIds: ['a', 'b', 'c'] }
      );
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('scores length mismatch as incorrect', () => {
      const result = scoreQuestion(
        type,
        { orderedIds: ['a', 'b'] },
        { orderedIds: ['a', 'b', 'c'] }
      );
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('returns 0 for non-array response', () => {
      const result = scoreQuestion(type, { orderedIds: 'abc' }, { orderedIds: ['a'] });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('returns 0 for missing orderedIds', () => {
      const result = scoreQuestion(type, {}, { orderedIds: ['a'] });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });
  });

  // ===========================================================================
  // IMAGE_MAP
  // ===========================================================================

  describe('IMAGE_MAP', () => {
    const type = QuestionType.IMAGE_MAP;

    describe('circle regions', () => {
      const options = {
        regions: [
          { id: 'r1', type: 'circle', cx: 100, cy: 100, r: 50 },
        ],
      };
      const correctAnswer = { regionId: 'r1' };

      it('scores click inside circle as correct', () => {
        const result = scoreQuestion(type, { x: 100, y: 100 }, correctAnswer, options);
        expect(result).toEqual({ score: 1, isCorrect: true });
      });

      it('scores click on circle edge as correct', () => {
        const result = scoreQuestion(type, { x: 150, y: 100 }, correctAnswer, options);
        expect(result).toEqual({ score: 1, isCorrect: true });
      });

      it('scores click outside circle as incorrect', () => {
        const result = scoreQuestion(type, { x: 200, y: 200 }, correctAnswer, options);
        expect(result).toEqual({ score: 0, isCorrect: false });
      });
    });

    describe('rectangle regions', () => {
      const options = {
        regions: [
          { id: 'r1', type: 'rect', x: 50, y: 50, width: 100, height: 80 },
        ],
      };
      const correctAnswer = { regionId: 'r1' };

      it('scores click inside rect as correct', () => {
        const result = scoreQuestion(type, { x: 100, y: 80 }, correctAnswer, options);
        expect(result).toEqual({ score: 1, isCorrect: true });
      });

      it('scores click on rect edge as correct', () => {
        const result = scoreQuestion(type, { x: 50, y: 50 }, correctAnswer, options);
        expect(result).toEqual({ score: 1, isCorrect: true });
      });

      it('scores click outside rect as incorrect', () => {
        const result = scoreQuestion(type, { x: 200, y: 200 }, correctAnswer, options);
        expect(result).toEqual({ score: 0, isCorrect: false });
      });
    });

    it('returns 0 for missing coordinates', () => {
      const result = scoreQuestion(type, {}, { regionId: 'r1' }, { regions: [] });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('returns 0 for missing region', () => {
      const options = { regions: [{ id: 'r2', type: 'circle', cx: 0, cy: 0, r: 10 }] };
      const result = scoreQuestion(type, { x: 0, y: 0 }, { regionId: 'r1' }, options);
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('returns 0 for missing options', () => {
      const result = scoreQuestion(type, { x: 0, y: 0 }, { regionId: 'r1' });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });
  });

  // ===========================================================================
  // SLIDER
  // ===========================================================================

  describe('SLIDER', () => {
    const type = QuestionType.SLIDER;

    it('scores exact value as correct', () => {
      const result = scoreQuestion(type, { value: 42 }, { value: 42, tolerance: 0 });
      expect(result).toEqual({ score: 1, isCorrect: true });
    });

    it('scores within tolerance as correct', () => {
      const result = scoreQuestion(type, { value: 43 }, { value: 42, tolerance: 2 });
      expect(result).toEqual({ score: 1, isCorrect: true });
    });

    it('scores at tolerance boundary as correct', () => {
      const result = scoreQuestion(type, { value: 44 }, { value: 42, tolerance: 2 });
      expect(result).toEqual({ score: 1, isCorrect: true });
    });

    it('scores outside tolerance as incorrect', () => {
      const result = scoreQuestion(type, { value: 45 }, { value: 42, tolerance: 2 });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('defaults tolerance to 0 when not specified', () => {
      const result = scoreQuestion(type, { value: 42 }, { value: 42 });
      expect(result).toEqual({ score: 1, isCorrect: true });

      const result2 = scoreQuestion(type, { value: 43 }, { value: 42 });
      expect(result2).toEqual({ score: 0, isCorrect: false });
    });

    it('returns 0 for non-number value', () => {
      const result = scoreQuestion(type, { value: 'forty-two' }, { value: 42 });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });

    it('returns 0 for missing value', () => {
      const result = scoreQuestion(type, {}, { value: 42 });
      expect(result).toEqual({ score: 0, isCorrect: false });
    });
  });
});

// =============================================================================
// calculateTotalScore
// =============================================================================

describe('calculateTotalScore', () => {
  it('calculates perfect score', () => {
    const scores = [
      { score: 1, isCorrect: true },
      { score: 1, isCorrect: true },
      { score: 1, isCorrect: true },
    ];
    const result = calculateTotalScore(scores, 80);
    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(3);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('calculates zero score', () => {
    const scores = [
      { score: 0, isCorrect: false },
      { score: 0, isCorrect: false },
    ];
    const result = calculateTotalScore(scores, 80);
    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(2);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('calculates fractional scores correctly', () => {
    const scores = [
      { score: 1, isCorrect: true },
      { score: 0.5, isCorrect: false },
      { score: 0, isCorrect: false },
    ];
    const result = calculateTotalScore(scores, 50);
    expect(result.score).toBe(1.5);
    expect(result.maxScore).toBe(3);
    expect(result.percentage).toBe(50);
    expect(result.passed).toBe(true);
  });

  it('determines pass at exact threshold', () => {
    const scores = [
      { score: 1, isCorrect: true },
      { score: 1, isCorrect: true },
      { score: 1, isCorrect: true },
      { score: 1, isCorrect: true },
      { score: 0, isCorrect: false },
    ];
    const result = calculateTotalScore(scores, 80);
    expect(result.percentage).toBe(80);
    expect(result.passed).toBe(true);
  });

  it('determines fail just below threshold', () => {
    const scores = [
      { score: 1, isCorrect: true },
      { score: 1, isCorrect: true },
      { score: 1, isCorrect: true },
      { score: 0, isCorrect: false },
      { score: 0, isCorrect: false },
    ];
    const result = calculateTotalScore(scores, 80);
    expect(result.percentage).toBe(60);
    expect(result.passed).toBe(false);
  });

  it('handles empty scores array', () => {
    const result = calculateTotalScore([], 80);
    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('handles single question', () => {
    const result = calculateTotalScore([{ score: 1, isCorrect: true }], 100);
    expect(result.score).toBe(1);
    expect(result.maxScore).toBe(1);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
  });
});
