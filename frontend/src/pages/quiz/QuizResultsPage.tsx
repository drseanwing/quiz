/**
 * @file        QuizResultsPage
 * @description Displays quiz results after completion
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';
import * as quizApi from '@/services/quizApi';
import { sanitizeHtml, safeUrl } from '@/utils/sanitize';
import { QuestionType, FeedbackTiming, type IQuestionResult } from '@/types';
import styles from './QuizResultsPage.module.css';

export function QuizResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['quiz-results', attemptId],
    queryFn: () => quizApi.getResults(attemptId!),
    enabled: !!attemptId,
  });

  if (isLoading) {
    return <div className={styles.page}><div className={styles.loading}>Loading results...</div></div>;
  }

  if (error || !results) {
    return (
      <div className={styles.page}>
        <Alert variant="error">{error instanceof Error ? error.message : 'Failed to load results'}</Alert>
        <Button onClick={() => navigate('/quizzes')}>Back to Quizzes</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{results.bankTitle}</h1>
        <span className={styles.status}>
          {results.status === 'TIMED_OUT' ? 'Timed Out' : 'Completed'}
        </span>
      </header>

      {/* Score card */}
      <div className={`${styles.scoreCard} ${results.passed ? styles.passed : styles.failed}`}>
        <div className={styles.scoreCircle}>
          <span className={styles.scorePercent}>{Math.round(results.percentage)}%</span>
        </div>
        <div className={styles.scoreDetails}>
          <div className={styles.passFail}>
            {results.passed ? 'PASSED' : 'NOT PASSED'}
          </div>
          <div className={styles.scoreText}>
            {results.score.toFixed(1)} / {results.maxScore} points
          </div>
          <div className={styles.timeTaken}>
            Time: {formatDuration(results.timeSpent)}
          </div>
        </div>
      </div>

      {/* Question review */}
      {results.feedbackTiming !== FeedbackTiming.NONE && results.questions.length > 0 && (
        <section className={styles.review}>
          <h2>Question Review</h2>
          {results.questions.map((q, i) => (
            <QuestionReviewCard key={q.id} question={q} index={i} />
          ))}
        </section>
      )}

      {/* Actions */}
      <footer className={styles.actions}>
        <Button variant="secondary" onClick={() => navigate('/quizzes')}>Back to Quizzes</Button>
      </footer>
    </div>
  );
}

function QuestionReviewCard({ question, index }: { question: IQuestionResult; index: number }) {
  return (
    <article className={`${styles.reviewCard} ${question.isCorrect ? styles.reviewCorrect : styles.reviewIncorrect}`} aria-label={`Question ${index + 1}`}>
      <div className={styles.reviewHeader}>
        <span className={styles.reviewNumber}>Q{index + 1}</span>
        <span className={styles.reviewType}>{formatType(question.type)}</span>
        <span className={`${styles.reviewBadge} ${question.isCorrect ? styles.badgeCorrect : styles.badgeIncorrect}`}>
          {question.isCorrect ? 'Correct' : question.score > 0 ? `Partial (${Math.round(question.score * 100)}%)` : 'Incorrect'}
        </span>
      </div>

      <div className={styles.reviewPrompt} dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.prompt) }} />

      {question.promptImage && safeUrl(question.promptImage) && (
        <img src={safeUrl(question.promptImage)} alt="" className={styles.reviewImage} />
      )}

      {/* User's answer */}
      <div className={styles.reviewAnswer}>
        <strong>Your answer: </strong>
        <span>{formatAnswer(question.type, question.userResponse, question.options)}</span>
      </div>

      {/* Correct answer */}
      {!question.isCorrect && (
        <div className={styles.reviewCorrectAnswer}>
          <strong>Correct answer: </strong>
          <span>{formatCorrectAnswer(question.type, question.correctAnswer, question.options)}</span>
        </div>
      )}

      {/* Feedback */}
      {question.feedback && (
        <div className={styles.reviewFeedback}>
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.feedback) }} />
        </div>
      )}

      {question.feedbackImage && safeUrl(question.feedbackImage) && (
        <img src={safeUrl(question.feedbackImage)} alt="Feedback illustration" className={styles.reviewImage} />
      )}

      {question.referenceLink && safeUrl(question.referenceLink) && (
        <a
          href={safeUrl(question.referenceLink)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.reviewLink}
        >
          Reference Link
        </a>
      )}
    </article>
  );
}

function formatType(type: QuestionType): string {
  const map: Record<string, string> = {
    MULTIPLE_CHOICE_SINGLE: 'Multiple Choice',
    MULTIPLE_CHOICE_MULTI: 'Multiple Select',
    TRUE_FALSE: 'True/False',
    DRAG_ORDER: 'Ordering',
    IMAGE_MAP: 'Image Map',
    SLIDER: 'Slider',
  };
  return map[type] || type;
}

function formatAnswer(type: QuestionType, response: unknown, options: unknown): string {
  if (!response) return 'Not answered';

  const resp = response as Record<string, unknown>;
  const opts = (Array.isArray(options) ? options : []) as Array<{ id: string; text: string }>;
  const optMap = new Map(opts.map(o => [o.id, o.text]));

  switch (type) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE: {
      return optMap.get(resp.optionId as string) || String(resp.optionId || '');
    }
    case QuestionType.MULTIPLE_CHOICE_MULTI: {
      const ids = (resp.optionIds as string[]) || [];
      return ids.map(id => optMap.get(id) || id).join(', ') || 'None selected';
    }
    case QuestionType.TRUE_FALSE:
      return resp.value === true ? 'True' : resp.value === false ? 'False' : 'Not answered';
    case QuestionType.DRAG_ORDER: {
      const ids = (resp.orderedIds as string[]) || [];
      return ids.map((id, i) => `${i + 1}. ${optMap.get(id) || id}`).join(', ');
    }
    case QuestionType.IMAGE_MAP:
      if (resp.x == null || resp.y == null) return 'Not answered';
      return `(${resp.x}, ${resp.y})`;
    case QuestionType.SLIDER:
      return String(resp.value ?? '');
    default:
      return JSON.stringify(response);
  }
}

function formatCorrectAnswer(type: QuestionType, answer: unknown, options: unknown): string {
  if (!answer) return '';

  const correct = answer as Record<string, unknown>;
  const opts = (Array.isArray(options) ? options : []) as Array<{ id: string; text: string }>;
  const optMap = new Map(opts.map(o => [o.id, o.text]));

  switch (type) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE:
      return optMap.get(correct.optionId as string) || String(correct.optionId || '');
    case QuestionType.MULTIPLE_CHOICE_MULTI: {
      const ids = (correct.optionIds as string[]) || [];
      return ids.map(id => optMap.get(id) || id).join(', ');
    }
    case QuestionType.TRUE_FALSE:
      return correct.value === true ? 'True' : 'False';
    case QuestionType.DRAG_ORDER: {
      const ids = (correct.orderedIds as string[]) || [];
      return ids.map((id, i) => `${i + 1}. ${optMap.get(id) || id}`).join(', ');
    }
    case QuestionType.SLIDER: {
      const val = correct.value as number;
      const tol = correct.tolerance as number;
      return tol > 0 ? `${val} (±${tol})` : String(val);
    }
    case QuestionType.IMAGE_MAP:
      return 'Target region on image';
    default:
      return JSON.stringify(answer);
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
