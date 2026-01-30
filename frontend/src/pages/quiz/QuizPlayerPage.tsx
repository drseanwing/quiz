/**
 * @file        QuizPlayerPage
 * @description Main quiz-taking page with timer, navigation, and question display
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QuestionRenderer } from '@/components/quiz/QuestionRenderer';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';
import * as quizApi from '@/services/quizApi';
import type { IQuizQuestion, IImmediateFeedback, FeedbackTiming } from '@/types';
import { AttemptStatus } from '@/types';
import styles from './QuizPlayerPage.module.css';

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

export function QuizPlayerPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  // Quiz state
  const [questions, setQuestions] = useState<IQuizQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bankTitle, setBankTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [feedbackTiming, setFeedbackTiming] = useState<FeedbackTiming>('END' as FeedbackTiming);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, IImmediateFeedback>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Refs for auto-save
  const responsesRef = useRef(responses);
  const elapsedRef = useRef(0);
  responsesRef.current = responses;

  // Load attempt
  useEffect(() => {
    if (!attemptId) return;

    async function load() {
      try {
        setLoading(true);
        const state = await quizApi.getAttempt(attemptId!);

        if (state.status !== AttemptStatus.IN_PROGRESS) {
          navigate(`/results/${attemptId}`, { replace: true });
          return;
        }

        setQuestions(state.questions);
        setResponses(state.responses);
        setBankTitle(state.bankTitle);
        setTimeLimit(state.timeLimit);
        setStartedAt(new Date(state.startedAt));
        setFeedbackTiming(state.feedbackTiming);
        elapsedRef.current = state.timeSpent;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load quiz';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [attemptId, navigate]);

  // Timer countdown
  useEffect(() => {
    if (!startedAt || timeLimit <= 0) return;

    function tick() {
      const elapsed = Math.floor((Date.now() - startedAt!.getTime()) / 1000);
      elapsedRef.current = elapsed;
      const remaining = timeLimit * 60 - elapsed;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        handleSubmit();
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, timeLimit]);

  // Auto-save
  useEffect(() => {
    if (!attemptId || loading) return;

    const id = setInterval(async () => {
      try {
        setSaveStatus('saving');
        await quizApi.saveProgress(attemptId!, responsesRef.current, elapsedRef.current);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(id);
  }, [attemptId, loading]);

  // Answer a question
  const setAnswer = useCallback((questionId: string, answer: unknown) => {
    setResponses(prev => {
      const updated = { ...prev, [questionId]: answer };

      // Save immediately for this question
      if (attemptId) {
        quizApi.saveProgress(attemptId, { [questionId]: answer }, elapsedRef.current)
          .then(result => {
            if (result.immediateFeedback) {
              setFeedbackMap(prev => {
                const next = { ...prev };
                for (const fb of result.immediateFeedback!) {
                  next[fb.questionId] = fb;
                }
                return next;
              });
            }
          })
          .catch(() => { /* auto-save will retry */ });
      }

      return updated;
    });
  }, [attemptId]);

  // Submit quiz
  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    setShowConfirm(false);

    try {
      // Final save before submit
      await quizApi.saveProgress(attemptId, responsesRef.current, elapsedRef.current);
      await quizApi.submitAttempt(attemptId);
      navigate(`/results/${attemptId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit quiz';
      setError(msg);
      setSubmitting(false);
    }
  }, [attemptId, submitting, navigate]);

  // Navigation
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(q => q.id in responses).length;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading quiz...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Alert type="error">{error}</Alert>
        <Button onClick={() => navigate('/quizzes')}>Back to Quizzes</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{bankTitle}</h1>
        <div className={styles.headerRight}>
          {timeRemaining !== null && (
            <div className={`${styles.timer} ${timeRemaining < 60 ? styles.timerWarning : ''}`}>
              {formatTime(timeRemaining)}
            </div>
          )}
          <div className={styles.saveStatus}>
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
        <span className={styles.progressText}>
          {answeredCount} / {questions.length} answered
        </span>
      </div>

      {/* Question navigation dots */}
      <nav className={styles.nav} aria-label="Question navigation">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            className={`${styles.navDot} ${i === currentIndex ? styles.navCurrent : ''} ${q.id in responses ? styles.navAnswered : ''}`}
            onClick={() => setCurrentIndex(i)}
            aria-label={`Question ${i + 1}${q.id in responses ? ' (answered)' : ''}`}
            aria-current={i === currentIndex ? 'step' : undefined}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      {/* Question */}
      {currentQuestion && (
        <div className={styles.questionCard}>
          <QuestionRenderer
            question={currentQuestion}
            questionIndex={currentIndex}
            totalQuestions={questions.length}
            answer={responses[currentQuestion.id] ?? null}
            onChange={(answer) => setAnswer(currentQuestion.id, answer)}
            feedback={feedbackMap[currentQuestion.id]}
          />
        </div>
      )}

      {/* Footer navigation */}
      <footer className={styles.footer}>
        <Button
          variant="secondary"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        <div className={styles.footerCenter}>
          {currentIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          )}
        </div>

        <span className={styles.footerRight}>
          {currentIndex + 1} / {questions.length}
        </span>
      </footer>

      {/* Submit confirmation */}
      {showConfirm && (
        <div className={styles.overlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <h2>Submit Quiz?</h2>
            {answeredCount < questions.length && (
              <p className={styles.warning}>
                You have answered {answeredCount} of {questions.length} questions.
                Unanswered questions will be scored as incorrect.
              </p>
            )}
            <p>Are you sure you want to submit your answers?</p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                Continue Quiz
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
