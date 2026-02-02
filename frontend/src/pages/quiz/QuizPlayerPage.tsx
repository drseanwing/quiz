/**
 * @file        QuizPlayerPage
 * @description Main quiz-taking page with timer, navigation, and question display
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QuestionRenderer } from '@/components/quiz/QuestionRenderer';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { queryKeys } from '@/lib/queryKeys';
import * as quizApi from '@/services/quizApi';
import type { IImmediateFeedback } from '@/types';
import { AttemptStatus } from '@/types';
import styles from './QuizPlayerPage.module.css';

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds
const DEBOUNCE_SAVE_DELAY = 1_500;  // 1.5 seconds debounce for per-answer saves

export function QuizPlayerPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  // Fetch quiz data with TanStack Query
  const { data: attemptData, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.quizAttempt(attemptId!),
    queryFn: async () => {
      if (!attemptId) throw new Error('No attempt ID');
      return await quizApi.getAttempt(attemptId);
    },
    enabled: !!attemptId,
  });

  // Redirect if attempt is not in progress
  useEffect(() => {
    if (attemptData && attemptData.status !== AttemptStatus.IN_PROGRESS) {
      navigate(`/results/${attemptId}`, { replace: true });
    }
  }, [attemptData, attemptId, navigate]);

  // Initialize state from query data
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, IImmediateFeedback>>({});
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Refs for auto-save and timer
  const responsesRef = useRef(responses);
  const elapsedRef = useRef(0);
  const handleSubmitRef = useRef<() => void>(() => {});
  const submittingRef = useRef(false);
  responsesRef.current = responses;

  // Sync state when query data loads
  useEffect(() => {
    if (attemptData) {
      setResponses(attemptData.responses);
      setStartedAt(new Date(attemptData.startedAt));
      elapsedRef.current = attemptData.timeSpent;
    }
  }, [attemptData]);

  // Timer countdown (uses ref to avoid stale closure)
  useEffect(() => {
    if (!startedAt || !attemptData?.timeLimit || attemptData.timeLimit <= 0) return;

    function tick() {
      const elapsed = Math.floor((Date.now() - startedAt!.getTime()) / 1000);
      elapsedRef.current = elapsed;
      const remaining = attemptData!.timeLimit * 60 - elapsed;
      setTimeRemaining(remaining);

      if (remaining <= 0 && !submittingRef.current) {
        handleSubmitRef.current();
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, attemptData?.timeLimit]);

  // Refs for debounce / auto-save status reset timers
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save
  useEffect(() => {
    if (!attemptId || isLoading) return;

    const id = setInterval(async () => {
      if (submittingRef.current) return; // Skip auto-save during submission
      try {
        setSaveStatus('saving');
        await quizApi.saveProgress(attemptId!, responsesRef.current, elapsedRef.current);
        setSaveStatus('saved');
        if (statusResetRef.current) clearTimeout(statusResetRef.current);
        statusResetRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(id);
  }, [attemptId, isLoading]);

  // Cleanup debounce and status reset timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (statusResetRef.current) clearTimeout(statusResetRef.current);
    };
  }, []);

  // Warn before navigating away with unsaved quiz progress
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (Object.keys(responsesRef.current).length > 0 && !submittingRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const setAnswer = useCallback((questionId: string, answer: unknown) => {
    setResponses(prev => ({ ...prev, [questionId]: answer }));

    // Debounce the API save to avoid flooding on rapid interactions (slider, drag)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
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
    }, DEBOUNCE_SAVE_DELAY);
  }, [attemptId]);

  // Submit quiz
  const handleSubmit = useCallback(async () => {
    if (!attemptId || submittingRef.current) return;
    setSubmitting(true);
    submittingRef.current = true;
    setShowConfirm(false);

    try {
      // Final save before submit
      await quizApi.saveProgress(attemptId, responsesRef.current, elapsedRef.current);
      await quizApi.submitAttempt(attemptId);
      navigate(`/results/${attemptId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit quiz';
      setSubmitError(msg);
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [attemptId, navigate]);

  // Keep ref in sync with latest handleSubmit
  handleSubmitRef.current = handleSubmit;

  // Extract data from query result
  const questions = attemptData?.questions ?? [];
  const bankTitle = attemptData?.bankTitle ?? '';
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(q => q.id in responses).length;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading quiz...</div>
      </div>
    );
  }

  if (queryError) {
    const errorMessage = queryError instanceof Error ? queryError.message : 'Failed to load quiz';
    return (
      <div className={styles.page}>
        <Alert variant="error">{errorMessage}</Alert>
        <Button onClick={() => navigate('/quizzes')}>Back to Quizzes</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {submitError && <Alert variant="error">{submitError}</Alert>}
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{bankTitle}</h1>
        <div className={styles.headerRight}>
          {timeRemaining !== null && (
            <div
              className={`${styles.timer} ${timeRemaining < 60 ? styles.timerWarning : ''}`}
              role="timer"
              aria-live={timeRemaining < 60 ? 'assertive' : 'off'}
              aria-label={`Time remaining: ${formatTime(timeRemaining)}`}
            >
              {formatTime(timeRemaining)}
            </div>
          )}
          <div className={styles.saveStatus} aria-live="polite">
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className={styles.progress}>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-label="Quiz progress"
        >
          <div
            className={styles.progressFill}
            style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
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
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Submit Quiz?">
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
      </Modal>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
