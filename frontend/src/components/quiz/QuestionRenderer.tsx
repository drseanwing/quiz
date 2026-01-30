/**
 * @file        QuestionRenderer component
 * @description Routes to the correct question type player component
 */

import { QuestionType, type IQuizQuestion, type IImmediateFeedback } from '@/types';
import { sanitizeHtml, safeUrl } from '@/utils/sanitize';
import { MCPlayer } from './MCPlayer';
import { TFPlayer } from './TFPlayer';
import { SliderPlayer } from './SliderPlayer';
import { DragOrderPlayer } from './DragOrderPlayer';
import { ImageMapPlayer } from './ImageMapPlayer';
import { FeedbackDisplay } from './FeedbackDisplay';
import styles from './QuestionRenderer.module.css';

interface QuestionRendererProps {
  question: IQuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  answer: unknown;
  onChange: (answer: unknown) => void;
  feedback?: IImmediateFeedback;
}

export function QuestionRenderer({
  question,
  questionIndex,
  totalQuestions,
  answer,
  onChange,
  feedback,
}: QuestionRendererProps) {
  const disabled = !!feedback;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.number}>
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <span className={styles.type}>{formatQuestionType(question.type)}</span>
      </div>

      <div
        className={styles.prompt}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.prompt) }}
      />

      {question.promptImage && safeUrl(question.promptImage) && (
        <img
          src={safeUrl(question.promptImage)}
          alt="Question illustration"
          className={styles.promptImage}
        />
      )}

      <div className={styles.answerArea}>
        {renderPlayer(question, answer, onChange, disabled)}
      </div>

      {feedback && <FeedbackDisplay feedback={feedback} />}
    </div>
  );
}

function renderPlayer(
  question: IQuizQuestion,
  answer: unknown,
  onChange: (answer: unknown) => void,
  disabled: boolean
) {
  switch (question.type) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE:
      return (
        <MCPlayer
          options={question.options as Array<{ id: string; text: string }>}
          answer={answer as { optionId?: string } | null}
          onChange={(optionId) => onChange({ optionId })}
          multi={false}
          disabled={disabled}
        />
      );
    case QuestionType.MULTIPLE_CHOICE_MULTI:
      return (
        <MCPlayer
          options={question.options as Array<{ id: string; text: string }>}
          answer={answer as { optionIds?: string[] } | null}
          onChange={(optionIds) => onChange({ optionIds })}
          multi={true}
          disabled={disabled}
        />
      );
    case QuestionType.TRUE_FALSE:
      return (
        <TFPlayer
          answer={answer as { value?: boolean } | null}
          onChange={(value) => onChange({ value })}
          disabled={disabled}
        />
      );
    case QuestionType.DRAG_ORDER:
      return (
        <DragOrderPlayer
          options={question.options as Array<{ id: string; text: string }>}
          answer={answer as { orderedIds?: string[] } | null}
          onChange={(orderedIds) => onChange({ orderedIds })}
          disabled={disabled}
        />
      );
    case QuestionType.IMAGE_MAP:
      return (
        <ImageMapPlayer
          options={question.options as { image?: string; regions?: unknown[] }}
          answer={answer as { x?: number; y?: number } | null}
          onChange={(coords) => onChange(coords)}
          disabled={disabled}
        />
      );
    case QuestionType.SLIDER:
      return (
        <SliderPlayer
          options={question.options as { min: number; max: number; step: number; unit?: string }}
          answer={answer as { value?: number } | null}
          onChange={(value) => onChange({ value })}
          disabled={disabled}
        />
      );
    default:
      return <p>Unsupported question type</p>;
  }
}

function formatQuestionType(type: QuestionType): string {
  const map: Record<QuestionType, string> = {
    [QuestionType.MULTIPLE_CHOICE_SINGLE]: 'Multiple Choice',
    [QuestionType.MULTIPLE_CHOICE_MULTI]: 'Multiple Select',
    [QuestionType.TRUE_FALSE]: 'True / False',
    [QuestionType.DRAG_ORDER]: 'Drag to Order',
    [QuestionType.IMAGE_MAP]: 'Image Map',
    [QuestionType.SLIDER]: 'Slider',
  };
  return map[type] || type;
}
