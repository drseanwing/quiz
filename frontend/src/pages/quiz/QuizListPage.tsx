/**
 * @file        QuizListPage
 * @description Shows available quizzes and user's attempt history
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import * as quizApi from '@/services/quizApi';
import * as questionBankApi from '@/services/questionBankApi';
import type { IQuestionBank, IAttemptSummary } from '@/types';
import { AttemptStatus } from '@/types';
import styles from './QuizListPage.module.css';

export function QuizListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [startError, setStartError] = useState<string | null>(null);

  const { data: banksResult, isLoading: banksLoading } = useQuery({
    queryKey: ['available-quizzes'],
    queryFn: () => questionBankApi.listQuestionBanks({ pageSize: 100 }),
  });

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => quizApi.listMyAttempts(),
  });

  const startMutation = useMutation({
    mutationFn: quizApi.startQuiz,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['my-attempts'] });
      navigate(`/quiz/${result.attemptId}`);
    },
    onError: (err) => {
      setStartError(err instanceof Error ? err.message : 'Failed to start quiz');
    },
  });

  const banks = (banksResult as unknown as { banks?: IQuestionBank[] })?.banks
    || (Array.isArray(banksResult) ? banksResult : []) as IQuestionBank[];

  const attemptsByBank = new Map<string, IAttemptSummary[]>();
  if (attempts) {
    for (const a of attempts) {
      const list = attemptsByBank.get(a.bankId) || [];
      list.push(a);
      attemptsByBank.set(a.bankId, list);
    }
  }

  // Check for in-progress attempts
  const inProgressAttempts = attempts?.filter(a => a.status === AttemptStatus.IN_PROGRESS) || [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Available Quizzes</h1>
      </header>

      {startError && (
        <Alert type="error" onDismiss={() => setStartError(null)}>{startError}</Alert>
      )}

      {/* Resume in-progress attempts */}
      {inProgressAttempts.length > 0 && (
        <section className={styles.section}>
          <h2>Continue Where You Left Off</h2>
          <div className={styles.grid}>
            {inProgressAttempts.map(attempt => (
              <Card key={attempt.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <h3>{attempt.bankTitle}</h3>
                  <p className={styles.meta}>
                    Started {new Date(attempt.startedAt).toLocaleDateString()}
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/quiz/${attempt.id}`)}
                  >
                    Resume
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Available quizzes */}
      <section className={styles.section}>
        {banksLoading || attemptsLoading ? (
          <p className={styles.loading}>Loading quizzes...</p>
        ) : banks.length === 0 ? (
          <p className={styles.empty}>No quizzes are currently available.</p>
        ) : (
          <div className={styles.grid}>
            {banks.map(bank => {
              const bankAttempts = attemptsByBank.get(bank.id) || [];
              const completedAttempts = bankAttempts.filter(
                a => a.status === AttemptStatus.COMPLETED || a.status === AttemptStatus.TIMED_OUT
              );
              const bestScore = completedAttempts.length > 0
                ? Math.max(...completedAttempts.map(a => a.percentage))
                : null;
              const hasInProgress = bankAttempts.some(a => a.status === AttemptStatus.IN_PROGRESS);

              return (
                <Card key={bank.id} className={styles.card}>
                  <div className={styles.cardBody}>
                    <h3>{bank.title}</h3>
                    {bank.description && (
                      <p className={styles.description}>{bank.description}</p>
                    )}
                    <div className={styles.cardMeta}>
                      <span>{bank.questionCount} questions</span>
                      {bank.timeLimit > 0 && <span>{bank.timeLimit} min</span>}
                      {bank.maxAttempts > 0 && (
                        <span>{completedAttempts.length}/{bank.maxAttempts} attempts</span>
                      )}
                    </div>
                    {bestScore !== null && (
                      <p className={styles.bestScore}>
                        Best score: {Math.round(bestScore)}%
                      </p>
                    )}
                    <div className={styles.cardActions}>
                      {hasInProgress ? (
                        <Button
                          variant="primary"
                          onClick={() => {
                            const ip = bankAttempts.find(a => a.status === AttemptStatus.IN_PROGRESS);
                            if (ip) navigate(`/quiz/${ip.id}`);
                          }}
                        >
                          Resume
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => startMutation.mutate(bank.id)}
                          disabled={startMutation.isPending}
                        >
                          {startMutation.isPending ? 'Starting...' : 'Start Quiz'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent attempts */}
      {attempts && attempts.length > 0 && (
        <section className={styles.section}>
          <h2>Your Attempt History</h2>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Quiz</span>
              <span>Status</span>
              <span>Score</span>
              <span>Date</span>
              <span />
            </div>
            {attempts
              .filter(a => a.status !== AttemptStatus.IN_PROGRESS)
              .slice(0, 20)
              .map(attempt => (
                <div key={attempt.id} className={styles.tableRow}>
                  <span className={styles.tableTitle}>{attempt.bankTitle}</span>
                  <span className={`${styles.tableStatus} ${attempt.passed ? styles.statusPassed : styles.statusFailed}`}>
                    {attempt.passed ? 'Passed' : attempt.status === 'TIMED_OUT' ? 'Timed Out' : 'Not Passed'}
                  </span>
                  <span>{Math.round(attempt.percentage)}%</span>
                  <span>{new Date(attempt.startedAt).toLocaleDateString()}</span>
                  <Link to={`/results/${attempt.id}`} className={styles.tableLink}>
                    View
                  </Link>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
