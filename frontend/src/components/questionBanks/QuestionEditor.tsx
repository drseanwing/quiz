/**
 * @file        QuestionEditor
 * @description Modal editor for creating/editing individual questions
 */

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createQuestion, updateQuestion } from '@/services/questionApi';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { ImageUpload } from '@/components/common/ImageUpload';
import { queryKeys } from '@/lib/queryKeys';
import { TYPE_LABELS } from '@/lib/constants';
import { QuestionType } from '@/types';
import type { IQuestion, IQuestionOption } from '@/types';
import { McOptionEditor } from './McOptionEditor';
import { TfEditor } from './TfEditor';
import { SliderEditor } from './SliderEditor';
import { DragOrderEditor } from './DragOrderEditor';
import { ImageMapEditor } from './ImageMapEditor';
import styles from './QuestionEditor.module.css';

const questionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  prompt: z.string().min(1, 'Question prompt is required'),
  feedback: z.string(),
  referenceLink: z.string().url('Must be a valid URL').nullable().or(z.literal('')),
});

type QuestionFormData = z.infer<typeof questionSchema>;

interface QuestionEditorProps {
  bankId: string;
  question: IQuestion | null;
  isOpen: boolean;
  onClose: () => void;
}

function getDefaultOptions(type: QuestionType): IQuestionOption[] | Record<string, unknown> {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE:
    case QuestionType.MULTIPLE_CHOICE_MULTI:
      return [
        { id: '1', text: 'Option A' },
        { id: '2', text: 'Option B' },
        { id: '3', text: 'Option C' },
        { id: '4', text: 'Option D' },
      ];
    case QuestionType.TRUE_FALSE:
      return [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ];
    case QuestionType.DRAG_ORDER:
      return [
        { id: '1', text: 'Item 1' },
        { id: '2', text: 'Item 2' },
        { id: '3', text: 'Item 3' },
      ];
    case QuestionType.SLIDER:
      return { min: 0, max: 100, step: 1, unit: '' };
    case QuestionType.IMAGE_MAP:
      return { regions: [] };
    default:
      return [];
  }
}

function getDefaultCorrectAnswer(type: QuestionType): unknown {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE:
      return '1';
    case QuestionType.MULTIPLE_CHOICE_MULTI:
      return ['1'];
    case QuestionType.TRUE_FALSE:
      return 'true';
    case QuestionType.DRAG_ORDER:
      return ['1', '2', '3'];
    case QuestionType.SLIDER:
      return { value: 50, tolerance: 5 };
    case QuestionType.IMAGE_MAP:
      return { regions: [] };
    default:
      return null;
  }
}

// ─── Scoring format conversion ──────────────────────────────────────────────

/**
 * Convert from scoring-engine format (stored in DB) to bare UI values.
 * Scoring engine stores: { optionId: "1" }, { optionIds: ["1"] }, { value: true }, { orderedIds: [...] }
 * UI state uses:         "1",               ["1"],                "true",          ["1","2","3"]
 */
function fromScoringFormat(type: QuestionType, answer: unknown): unknown {
  if (!answer || typeof answer !== 'object') return answer;
  const obj = answer as Record<string, unknown>;
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE:
      return obj.optionId ?? answer;
    case QuestionType.MULTIPLE_CHOICE_MULTI:
      return Array.isArray(obj.optionIds) ? obj.optionIds : answer;
    case QuestionType.TRUE_FALSE:
      return typeof obj.value === 'boolean' ? String(obj.value) : answer;
    case QuestionType.DRAG_ORDER:
      return Array.isArray(obj.orderedIds) ? obj.orderedIds : answer;
    default:
      return answer; // Slider & ImageMap already use object format
  }
}

/**
 * Convert from bare UI values to scoring-engine format for DB storage.
 */
function toScoringFormat(type: QuestionType, answer: unknown): unknown {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE:
      return typeof answer === 'string' ? { optionId: answer } : answer;
    case QuestionType.MULTIPLE_CHOICE_MULTI:
      return Array.isArray(answer) ? { optionIds: answer } : answer;
    case QuestionType.TRUE_FALSE:
      if (answer === 'true') return { value: true };
      if (answer === 'false') return { value: false };
      return answer;
    case QuestionType.DRAG_ORDER:
      return Array.isArray(answer) ? { orderedIds: answer } : answer;
    default:
      return answer; // Slider & ImageMap already use object format
  }
}

// ─── Main QuestionEditor ────────────────────────────────────────────────────

export function QuestionEditor({ bankId, question, isOpen, onClose }: QuestionEditorProps) {
  const queryClient = useQueryClient();
  const isEditing = !!question;

  const [options, setOptions] = useState<IQuestionOption[] | Record<string, unknown>>(
    question?.options ?? getDefaultOptions(QuestionType.MULTIPLE_CHOICE_SINGLE)
  );
  const [correctAnswer, setCorrectAnswer] = useState<unknown>(
    question ? fromScoringFormat(question.type, question.correctAnswer) : getDefaultCorrectAnswer(QuestionType.MULTIPLE_CHOICE_SINGLE)
  );
  const [promptImage, setPromptImage] = useState<string>(question?.promptImage ?? '');
  const [feedbackImage, setFeedbackImage] = useState<string>(question?.feedbackImage ?? '');

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: question?.type ?? QuestionType.MULTIPLE_CHOICE_SINGLE,
      prompt: question?.prompt ?? '',
      feedback: question?.feedback ?? '',
      referenceLink: question?.referenceLink ?? '',
    },
  });

  const questionType = watch('type');

  // Reset options when type changes
  useEffect(() => {
    if (!isEditing) {
      setOptions(getDefaultOptions(questionType));
      setCorrectAnswer(getDefaultCorrectAnswer(questionType));
    }
  }, [questionType, isEditing]);

  // Reset form when question changes
  useEffect(() => {
    if (question) {
      reset({
        type: question.type,
        prompt: question.prompt,
        feedback: question.feedback,
        referenceLink: question.referenceLink ?? '',
      });
      setOptions(question.options);
      setCorrectAnswer(fromScoringFormat(question.type, question.correctAnswer));
      setPromptImage(question.promptImage ?? '');
      setFeedbackImage(question.feedbackImage ?? '');
    } else {
      reset({
        type: QuestionType.MULTIPLE_CHOICE_SINGLE,
        prompt: '',
        feedback: '',
        referenceLink: '',
      });
      setOptions(getDefaultOptions(QuestionType.MULTIPLE_CHOICE_SINGLE));
      setCorrectAnswer(getDefaultCorrectAnswer(QuestionType.MULTIPLE_CHOICE_SINGLE));
      setPromptImage('');
      setFeedbackImage('');
    }
  }, [question, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: QuestionFormData) => {
      const payload: Partial<IQuestion> = {
        ...data,
        options: options as IQuestionOption[] | Record<string, unknown>,
        correctAnswer: toScoringFormat(data.type, correctAnswer),
        promptImage: promptImage || null,
        feedbackImage: feedbackImage || null,
        referenceLink: data.referenceLink || null,
      };
      return isEditing
        ? updateQuestion(question!.id, payload)
        : createQuestion(bankId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(bankId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank(bankId) });
      onClose();
    },
  });

  const onSubmit: (data: QuestionFormData) => void = (data: QuestionFormData) => {
    saveMutation.mutate(data);
  };

  function handleOptionsChange(
    newOptions: IQuestionOption[] | Record<string, unknown>,
    newCorrectAnswer: unknown
  ) {
    setOptions(newOptions);
    setCorrectAnswer(newCorrectAnswer);
  }

  function handleClose() {
    if (isDirty && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Question' : 'Add Question'}
      className={styles.modal}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {saveMutation.error && (
          <Alert variant="error" className={styles.alert}>
            Failed to save question. Please try again.
          </Alert>
        )}

        <div className={styles.field}>
          <label htmlFor="questionType" className={styles.label}>
            Question Type
          </label>
          <select
            id="questionType"
            {...register('type')}
            className={styles.select}
            disabled={isEditing}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Question Prompt</label>
          <Controller
            name="prompt"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                content={field.value}
                onChange={field.onChange}
                placeholder="Enter the question prompt..."
              />
            )}
          />
          {errors.prompt && (
            <p className={styles.error}>{errors.prompt.message}</p>
          )}
        </div>

        <ImageUpload
          label="Prompt Image (optional)"
          value={promptImage}
          onChange={setPromptImage}
        />

        {/* Type-specific answer editors */}
        {(questionType === QuestionType.MULTIPLE_CHOICE_SINGLE ||
          questionType === QuestionType.MULTIPLE_CHOICE_MULTI) && (
          <McOptionEditor
            options={Array.isArray(options) ? options : []}
            correctAnswer={correctAnswer}
            isMulti={questionType === QuestionType.MULTIPLE_CHOICE_MULTI}
            onChange={(opts, ans) => handleOptionsChange(opts, ans)}
          />
        )}

        {questionType === QuestionType.TRUE_FALSE && (
          <TfEditor
            correctAnswer={correctAnswer}
            onChange={(ans) => setCorrectAnswer(ans)}
          />
        )}

        {questionType === QuestionType.SLIDER && (
          <SliderEditor
            options={typeof options === 'object' && !Array.isArray(options) ? options : {}}
            correctAnswer={correctAnswer}
            onChange={(opts, ans) => handleOptionsChange(opts, ans)}
          />
        )}

        {questionType === QuestionType.DRAG_ORDER && (
          <DragOrderEditor
            options={Array.isArray(options) ? options : []}
            correctAnswer={correctAnswer}
            onChange={(opts, ans) => handleOptionsChange(opts, ans)}
          />
        )}

        {questionType === QuestionType.IMAGE_MAP && (
          <ImageMapEditor
            options={typeof options === 'object' && !Array.isArray(options) ? options : {}}
            correctAnswer={correctAnswer}
            onChange={(opts, ans) => handleOptionsChange(opts, ans)}
          />
        )}

        <div className={styles.field}>
          <label className={styles.label}>Feedback</label>
          <Controller
            name="feedback"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                content={field.value}
                onChange={field.onChange}
                placeholder="Explanation shown after answering..."
              />
            )}
          />
        </div>

        <ImageUpload
          label="Feedback Image (optional)"
          value={feedbackImage}
          onChange={setFeedbackImage}
        />

        <Input
          label="Reference Link"
          type="url"
          {...register('referenceLink')}
          error={errors.referenceLink?.message}
          helpText="Optional URL for further reading"
        />

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saveMutation.isPending}>
            {isEditing ? 'Save Changes' : 'Add Question'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
