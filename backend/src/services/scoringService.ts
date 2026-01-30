/**
 * @file        Scoring Service
 * @module      Services/Scoring
 * @description Per-question-type scoring logic and total score calculation
 */

import { QuestionType } from '@prisma/client';

export interface IScoringResult {
  score: number;
  isCorrect: boolean;
}

export interface ITotalScoreResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
}

/**
 * Score a single question response based on question type
 */
export function scoreQuestion(
  type: QuestionType,
  response: unknown,
  correctAnswer: unknown,
  options?: unknown
): IScoringResult {
  if (response === null || response === undefined) {
    return { score: 0, isCorrect: false };
  }

  switch (type) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE:
      return scoreMCSingle(response, correctAnswer);
    case QuestionType.MULTIPLE_CHOICE_MULTI:
      return scoreMCMulti(response, correctAnswer);
    case QuestionType.TRUE_FALSE:
      return scoreTrueFalse(response, correctAnswer);
    case QuestionType.DRAG_ORDER:
      return scoreDragOrder(response, correctAnswer);
    case QuestionType.IMAGE_MAP:
      return scoreImageMap(response, correctAnswer, options);
    case QuestionType.SLIDER:
      return scoreSlider(response, correctAnswer);
    default:
      return { score: 0, isCorrect: false };
  }
}

/**
 * Calculate total score from individual question scores
 */
export function calculateTotalScore(
  questionScores: IScoringResult[],
  passingScore: number
): ITotalScoreResult {
  const maxScore = questionScores.length;
  const score = questionScores.reduce((sum, qs) => sum + qs.score, 0);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100 * 100) / 100 : 0;
  const passed = percentage >= passingScore;

  return { score, maxScore, percentage, passed };
}

// ---------------------------------------------------------------------------
// Per-type scorers
// ---------------------------------------------------------------------------

function scoreMCSingle(response: unknown, correctAnswer: unknown): IScoringResult {
  const resp = response as { optionId?: string };
  const correct = correctAnswer as { optionId?: string };

  if (!resp.optionId || !correct.optionId) {
    return { score: 0, isCorrect: false };
  }

  const isCorrect = resp.optionId === correct.optionId;
  return { score: isCorrect ? 1 : 0, isCorrect };
}

function scoreMCMulti(response: unknown, correctAnswer: unknown): IScoringResult {
  const resp = response as { optionIds?: string[] };
  const correct = correctAnswer as { optionIds?: string[] };

  if (!Array.isArray(resp.optionIds) || !Array.isArray(correct.optionIds) || correct.optionIds.length === 0) {
    return { score: 0, isCorrect: false };
  }

  const correctSet = new Set(correct.optionIds);
  const totalCorrect = correctSet.size;

  let points = 0;
  for (const id of resp.optionIds) {
    if (correctSet.has(id)) {
      points += 1 / totalCorrect;
    } else {
      points -= 1 / totalCorrect;
    }
  }

  const score = Math.max(0, Math.min(1, points));
  return { score, isCorrect: score === 1 };
}

function scoreTrueFalse(response: unknown, correctAnswer: unknown): IScoringResult {
  const resp = response as { value?: boolean };
  const correct = correctAnswer as { value?: boolean };

  if (typeof resp.value !== 'boolean' || typeof correct.value !== 'boolean') {
    return { score: 0, isCorrect: false };
  }

  const isCorrect = resp.value === correct.value;
  return { score: isCorrect ? 1 : 0, isCorrect };
}

function scoreDragOrder(response: unknown, correctAnswer: unknown): IScoringResult {
  const resp = response as { orderedIds?: string[] };
  const correct = correctAnswer as { orderedIds?: string[] };

  if (!Array.isArray(resp.orderedIds) || !Array.isArray(correct.orderedIds)) {
    return { score: 0, isCorrect: false };
  }

  if (resp.orderedIds.length !== correct.orderedIds.length) {
    return { score: 0, isCorrect: false };
  }

  const isCorrect = resp.orderedIds.every((id, i) => id === correct.orderedIds![i]);
  return { score: isCorrect ? 1 : 0, isCorrect };
}

function scoreImageMap(response: unknown, correctAnswer: unknown, options?: unknown): IScoringResult {
  const resp = response as { x?: number; y?: number };
  const correct = correctAnswer as { regionId?: string };
  const opts = options as { regions?: Array<{ id: string; type: string; cx?: number; cy?: number; r?: number; x?: number; y?: number; width?: number; height?: number }> } | undefined;

  if (typeof resp.x !== 'number' || typeof resp.y !== 'number' || !correct.regionId || !opts?.regions) {
    return { score: 0, isCorrect: false };
  }

  const region = opts.regions.find(r => r.id === correct.regionId);
  if (!region) {
    return { score: 0, isCorrect: false };
  }

  let hit = false;
  if (region.type === 'circle' && typeof region.cx === 'number' && typeof region.cy === 'number' && typeof region.r === 'number') {
    const distance = Math.sqrt((resp.x - region.cx) ** 2 + (resp.y - region.cy) ** 2);
    hit = distance <= region.r;
  } else if (region.type === 'rect' && typeof region.x === 'number' && typeof region.y === 'number' && typeof region.width === 'number' && typeof region.height === 'number') {
    hit = resp.x >= region.x && resp.x <= region.x + region.width && resp.y >= region.y && resp.y <= region.y + region.height;
  }

  return { score: hit ? 1 : 0, isCorrect: hit };
}

function scoreSlider(response: unknown, correctAnswer: unknown): IScoringResult {
  const resp = response as { value?: number };
  const correct = correctAnswer as { value?: number; tolerance?: number };

  if (typeof resp.value !== 'number' || typeof correct.value !== 'number') {
    return { score: 0, isCorrect: false };
  }

  const tolerance = typeof correct.tolerance === 'number' ? correct.tolerance : 0;
  const isCorrect = Math.abs(resp.value - correct.value) <= tolerance;
  return { score: isCorrect ? 1 : 0, isCorrect };
}
