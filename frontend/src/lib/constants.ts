/**
 * @file        constants
 * @description Shared constants used across the application
 */

import { QuestionType } from '@/types';

export const TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE_SINGLE]: 'Multiple Choice (Single)',
  [QuestionType.MULTIPLE_CHOICE_MULTI]: 'Multiple Choice (Multi)',
  [QuestionType.TRUE_FALSE]: 'True / False',
  [QuestionType.DRAG_ORDER]: 'Drag to Order',
  [QuestionType.IMAGE_MAP]: 'Image Map',
  [QuestionType.SLIDER]: 'Slider',
};
