/**
 * @file        QuizListPage
 * @description Shows available quizzes and user's attempt history
 */

import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Spinner } from '@/components/common/Spinner';
import { queryKeys } from '@/lib/queryKeys';
import * as quizApi from '@/services/quizApi';
import * as questionBankApi from '@/services/questionBankApi';
import type { IQuestionBank, IAttemptSummary } from '@/types';
import { AttemptStatus } from '@/types';
import styles from './QuizListPage.module.css';

export function QuizListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [startError, setStartError] = useState<string | null>(null);
  const [startingBankId, setStartingBankId] = useState<string | null>(null);

  const { data: banksResult, isLoading: banksLoading } = useQuery({
    queryKey: queryKeys.availableQuizzes,
    queryFn: () => questionBankApi.listQuestionBanks({ pageSize: 100 }),
  });

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: queryKeys.myAttempts,
    queryFn: () => quizApi.listMyAttempts(),
  });

  const startMutation = useMutation({
    mutationFn: (bankId: string) => {
      setStartingBankId(bankId);
      return quizApi.startQuiz(bankId);
    },
    onSuccess: (result) => {
      setStartingBankId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.myAttempts });
      navigate(`/quiz/${result.attemptId}`);
    },
    onError: (err) => {
      setStartingBankId(null);
      setStartError(err instanceof Error ? err.message : 'Failed to start quiz');
    },
  });

  const banks = (banksResult?.banks ?? []) as IQuestionBank[];

  const attemptsByBank = useMemo(() => {
    const map = new Map<string, IAttemptSummary[]>();
    if (attempts) {
      for (const a of attempts) {
        const list = map.get(a.bankId) || [];
        list.push(a);
        map.set(a.bankId, list);
      }
    }
    return map;
  }, [attempts]);

  // Check for in-progress attempts
  const inProgressAttempts = attempts?.filter(a => a.status === AttemptStatus.IN_PROGRESS) || [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Available Quizzes</h1>
      </header>

      {startError && (
        <Alert variant="error" onDismiss={() => setStartError(null)}>{startError}</Alert>
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
        <h2 className="visually-hidden">Available Quizzes</h2>
        {banksLoading || attemptsLoading ? (
          <div className={styles.loading}><Spinner size="lg" /></div>
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
                        <>
                          {bank.maxAttempts > 0 && completedAttempts.length >= bank.maxAttempts ? (
                            <>
                              <Button
                                variant="primary"
                                disabled
                              >
                                Start Quiz
                              </Button>
                              <p className={styles.maxAttemptsReached}>Maximum attempts reached</p>
                            </>
                          ) : (
                            <Button
                              variant="primary"
                              onClick={() => startMutation.mutate(bank.id)}
                              disabled={startMutation.isPending && startingBankId === bank.id}
                            >
                              {startMutation.isPending && startingBankId === bank.id ? 'Starting...' : 'Start Quiz'}
                            </Button>
                          )}
                        </>
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
          <table className={styles.table} aria-label="Your attempt history">
            <thead>
              <tr className={styles.tableHeader}>
                <th scope="col">Quiz</th>
                <th scope="col">Status</th>
                <th scope="col">Score</th>
                <th scope="col">Date</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
            {attempts
              .filter(a => a.status !== AttemptStatus.IN_PROGRESS)
              .slice(0, 20)
              .map(attempt => (
                <tr key={attempt.id} className={styles.tableRow}>
                  <td className={styles.tableTitle}>{attempt.bankTitle}</td>
                  <td className={`${styles.tableStatus} ${attempt.passed ? styles.statusPassed : styles.statusFailed}`}>
                    {attempt.passed ? 'Passed' : attempt.status === 'TIMED_OUT' ? 'Timed Out' : 'Not Passed'}
                  </td>
                  <td>{Math.round(attempt.percentage)}%</td>
                  <td>{new Date(attempt.startedAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/results/${attempt.id}`} className={styles.tableLink}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
