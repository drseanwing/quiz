/**
 * @file        QuestionBankEditorPage
 * @description Page for creating or editing a question bank
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getQuestionBank,
  createQuestionBank,
  updateQuestionBank,
} from '@/services/questionBankApi';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Alert } from '@/components/common/Alert';
import { Spinner } from '@/components/common/Spinner';
import { QuestionList } from '@/components/questionBanks/QuestionList';
import { QuestionEditor } from '@/components/questionBanks/QuestionEditor';
import { ExportButton } from '@/components/questionBanks/ExportButton';
import { QuestionBankStatus, FeedbackTiming } from '@/types';
import type { IQuestion } from '@/types';
import styles from './QuestionBankEditorPage.module.css';

const bankSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').nullable(),
  status: z.nativeEnum(QuestionBankStatus),
  timeLimit: z.coerce.number().int().min(0, 'Must be 0 or more'),
  questionCount: z.coerce.number().int().min(1, 'Must be at least 1'),
  passingScore: z.coerce.number().int().min(0).max(100),
  maxAttempts: z.coerce.number().int().min(0, 'Must be 0 or more'),
  randomQuestions: z.boolean(),
  randomAnswers: z.boolean(),
  feedbackTiming: z.nativeEnum(FeedbackTiming),
  notificationEmail: z.string().email('Invalid email').nullable().or(z.literal('')),
});

type BankFormData = z.infer<typeof bankSchema>;

const STATUS_LABELS: Record<QuestionBankStatus, string> = {
  [QuestionBankStatus.DRAFT]: 'Draft',
  [QuestionBankStatus.OPEN]: 'Open (link-only)',
  [QuestionBankStatus.PUBLIC]: 'Public',
  [QuestionBankStatus.ARCHIVED]: 'Archived',
};

const FEEDBACK_LABELS: Record<FeedbackTiming, string> = {
  [FeedbackTiming.IMMEDIATE]: 'After each question',
  [FeedbackTiming.END]: 'At the end of the quiz',
  [FeedbackTiming.NONE]: 'No feedback',
};

export function QuestionBankEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(null);

  const { data: bank, isLoading: isFetching, error: fetchError } = useQuery({
    queryKey: ['questionBank', id],
    queryFn: () => getQuestionBank(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      title: '',
      description: null,
      status: QuestionBankStatus.DRAFT,
      timeLimit: 0,
      questionCount: 10,
      passingScore: 80,
      maxAttempts: 0,
      randomQuestions: true,
      randomAnswers: true,
      feedbackTiming: FeedbackTiming.END,
      notificationEmail: '',
    },
  });

  useEffect(() => {
    if (bank) {
      reset({
        title: bank.title,
        description: bank.description,
        status: bank.status,
        timeLimit: bank.timeLimit,
        questionCount: bank.questionCount,
        passingScore: bank.passingScore,
        maxAttempts: bank.maxAttempts,
        randomQuestions: bank.randomQuestions,
        randomAnswers: bank.randomAnswers,
        feedbackTiming: bank.feedbackTiming,
        notificationEmail: bank.notificationEmail || '',
      });
    }
  }, [bank, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: BankFormData) => {
      const payload = {
        ...data,
        notificationEmail: data.notificationEmail || null,
        description: data.description || null,
      };
      return isNew
        ? createQuestionBank(payload)
        : updateQuestionBank(id!, payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['questionBanks'] });
      if (isNew) {
        navigate(`/question-banks/${result.id}`, { replace: true });
      } else {
        queryClient.invalidateQueries({ queryKey: ['questionBank', id] });
      }
    },
  });

  function onSubmit(data: BankFormData) {
    saveMutation.mutate(data);
  }

  if (isFetching) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={styles.page}>
        <Alert variant="error">
          Failed to load question bank. It may not exist or you may not have access.
        </Alert>
        <Button variant="outline" onClick={() => navigate('/question-banks')}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isNew ? 'Create Question Bank' : 'Edit Question Bank'}
        </h1>
        <div className={styles.headerActions}>
          {!isNew && bank && (
            <ExportButton bankId={id!} bankTitle={bank.title} />
          )}
          <Button variant="outline" onClick={() => navigate('/question-banks')}>
            Back to list
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {saveMutation.error && (
          <Alert variant="error" className={styles.alert}>
            Failed to save question bank. Please try again.
          </Alert>
        )}

        {saveMutation.isSuccess && (
          <Alert variant="success" className={styles.alert}>
            Question bank saved successfully.
          </Alert>
        )}

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Basic Information</h2>
          <Input
            label="Title"
            {...register('title')}
            error={errors.title?.message}
            required
          />
          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              className={styles.textarea}
              rows={4}
              placeholder="Optional description for this question bank..."
            />
            {errors.description && (
              <p className={styles.error}>{errors.description.message}</p>
            )}
          </div>
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Status</h2>
          <div className={styles.field}>
            <label htmlFor="status" className={styles.label}>
              Visibility
            </label>
            <select
              id="status"
              {...register('status')}
              className={styles.select}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Quiz Settings</h2>
          <div className={styles.settingsGrid}>
            <Input
              label="Time Limit (minutes)"
              type="number"
              {...register('timeLimit')}
              error={errors.timeLimit?.message}
              helpText="0 = no time limit"
            />
            <Input
              label="Questions per Quiz"
              type="number"
              {...register('questionCount')}
              error={errors.questionCount?.message}
              helpText="Number of questions served"
            />
            <Input
              label="Passing Score (%)"
              type="number"
              {...register('passingScore')}
              error={errors.passingScore?.message}
            />
            <Input
              label="Max Attempts"
              type="number"
              {...register('maxAttempts')}
              error={errors.maxAttempts?.message}
              helpText="0 = unlimited"
            />
          </div>
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Randomization</h2>
          <div className={styles.checkboxGroup}>
            <Controller
              name="randomQuestions"
              control={control}
              render={({ field }) => (
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className={styles.checkbox}
                  />
                  Randomize question order
                </label>
              )}
            />
            <Controller
              name="randomAnswers"
              control={control}
              render={({ field }) => (
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className={styles.checkbox}
                  />
                  Randomize answer order
                </label>
              )}
            />
          </div>
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Feedback</h2>
          <div className={styles.field}>
            <label htmlFor="feedbackTiming" className={styles.label}>
              When to show feedback
            </label>
            <select
              id="feedbackTiming"
              {...register('feedbackTiming')}
              className={styles.select}
            >
              {Object.entries(FEEDBACK_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Notifications</h2>
          <Input
            label="Notification Email"
            type="email"
            {...register('notificationEmail')}
            error={errors.notificationEmail?.message}
            helpText="Receive email when a student completes this quiz"
          />
        </Card>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/question-banks')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saveMutation.isPending}
            disabled={!isDirty && !isNew}
          >
            {isNew ? 'Create' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {!isNew && id && (
        <>
          <QuestionList
            bankId={id}
            onEditQuestion={(q) => {
              setEditingQuestion(q);
              setEditorOpen(true);
            }}
            onAddQuestion={() => {
              setEditingQuestion(null);
              setEditorOpen(true);
            }}
          />
          <QuestionEditor
            bankId={id}
            question={editingQuestion}
            isOpen={editorOpen}
            onClose={() => {
              setEditorOpen(false);
              setEditingQuestion(null);
            }}
          />
        </>
      )}
    </div>
  );
}
