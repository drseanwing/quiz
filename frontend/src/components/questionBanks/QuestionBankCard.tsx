/**
 * @file        QuestionBankCard component
 * @description Card display for a question bank in list view
 */

import { Link } from 'react-router-dom';
import type { IQuestionBank } from '@/types';
import { QuestionBankStatus } from '@/types';
import styles from './QuestionBankCard.module.css';

interface QuestionBankCardProps {
  bank: IQuestionBank;
}

const STATUS_LABELS: Record<QuestionBankStatus, string> = {
  [QuestionBankStatus.DRAFT]: 'Draft',
  [QuestionBankStatus.OPEN]: 'Open',
  [QuestionBankStatus.PUBLIC]: 'Public',
  [QuestionBankStatus.ARCHIVED]: 'Archived',
};

export function QuestionBankCard({ bank }: QuestionBankCardProps) {
  return (
    <Link to={`/question-banks/${bank.id}`} className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{bank.title}</h3>
        <span className={`${styles.status} ${styles[`status${bank.status}`]}`}>
          {STATUS_LABELS[bank.status]}
        </span>
      </div>

      {bank.description && (
        <p className={styles.description}>{bank.description}</p>
      )}

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          {bank.questionCount} questions
        </span>
        <span className={styles.metaItem}>
          {bank.passingScore}% to pass
        </span>
        {bank.timeLimit > 0 && (
          <span className={styles.metaItem}>
            {bank.timeLimit} min
          </span>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.date}>
          Updated {new Date(bank.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
