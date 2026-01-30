/**
 * @file        FeedbackDisplay component
 * @description Shows immediate feedback for a question
 */

import type { IImmediateFeedback } from '@/types';
import styles from './FeedbackDisplay.module.css';

interface FeedbackDisplayProps {
  feedback: IImmediateFeedback;
}

export function FeedbackDisplay({ feedback }: FeedbackDisplayProps) {
  return (
    <div className={`${styles.container} ${feedback.isCorrect ? styles.correct : styles.incorrect}`}>
      <div className={styles.badge}>
        {feedback.isCorrect ? 'Correct' : 'Incorrect'}
        {!feedback.isCorrect && feedback.score > 0 && (
          <span className={styles.partial}> (Partial: {Math.round(feedback.score * 100)}%)</span>
        )}
      </div>
      {feedback.feedback && (
        <div
          className={styles.text}
          dangerouslySetInnerHTML={{ __html: feedback.feedback }}
        />
      )}
      {feedback.feedbackImage && (
        <img src={feedback.feedbackImage} alt="Feedback illustration" className={styles.image} />
      )}
    </div>
  );
}
