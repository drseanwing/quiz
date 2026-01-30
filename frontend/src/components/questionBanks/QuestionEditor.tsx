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
import { QuestionType } from '@/types';
import type { IQuestion, IQuestionOption } from '@/types';
import styles from './QuestionEditor.module.css';

const TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE_SINGLE]: 'Multiple Choice (Single)',
  [QuestionType.MULTIPLE_CHOICE_MULTI]: 'Multiple Choice (Multi)',
  [QuestionType.TRUE_FALSE]: 'True / False',
  [QuestionType.DRAG_ORDER]: 'Drag to Order',
  [QuestionType.IMAGE_MAP]: 'Image Map',
  [QuestionType.SLIDER]: 'Slider',
};

const questionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  prompt: z.string().min(1, 'Question prompt is required'),
  feedback: z.string().default(''),
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

// ─── Multiple Choice Option Editor ──────────────────────────────────────────

interface McOptionEditorProps {
  options: IQuestionOption[];
  correctAnswer: unknown;
  isMulti: boolean;
  onChange: (options: IQuestionOption[], correctAnswer: unknown) => void;
}

function McOptionEditor({ options, correctAnswer, isMulti, onChange }: McOptionEditorProps) {
  function addOption() {
    const newId = String(options.length + 1);
    onChange(
      [...options, { id: newId, text: `Option ${String.fromCharCode(65 + options.length)}` }],
      correctAnswer
    );
  }

  function removeOption(id: string) {
    if (options.length <= 2) return;
    const filtered = options.filter((o) => o.id !== id);
    // Clean up correct answer references
    if (isMulti) {
      const answers = Array.isArray(correctAnswer) ? correctAnswer : [];
      onChange(filtered, answers.filter((a: string) => a !== id));
    } else {
      onChange(filtered, correctAnswer === id ? filtered[0]?.id : correctAnswer);
    }
  }

  function updateText(id: string, text: string) {
    onChange(
      options.map((o) => (o.id === id ? { ...o, text } : o)),
      correctAnswer
    );
  }

  function toggleCorrect(id: string) {
    if (isMulti) {
      const answers = Array.isArray(correctAnswer) ? (correctAnswer as string[]) : [];
      const next = answers.includes(id)
        ? answers.filter((a) => a !== id)
        : [...answers, id];
      onChange(options, next.length > 0 ? next : [id]);
    } else {
      onChange(options, id);
    }
  }

  return (
    <div className={styles.optionEditor}>
      <label className={styles.optionLabel}>Answer Options</label>
      {options.map((opt) => {
        const isCorrect = isMulti
          ? Array.isArray(correctAnswer) && (correctAnswer as string[]).includes(opt.id)
          : correctAnswer === opt.id;

        return (
          <div key={opt.id} className={styles.optionRow}>
            <input
              type={isMulti ? 'checkbox' : 'radio'}
              name="correctAnswer"
              checked={isCorrect}
              onChange={() => toggleCorrect(opt.id)}
              className={styles.optionRadio}
              aria-label={`Mark "${opt.text}" as correct`}
            />
            <input
              type="text"
              value={opt.text}
              onChange={(e) => updateText(opt.id, e.target.value)}
              className={styles.optionInput}
            />
            {options.length > 2 && (
              <button
                type="button"
                className={styles.removeOption}
                onClick={() => removeOption(opt.id)}
                aria-label={`Remove option "${opt.text}"`}
              >
                &times;
              </button>
            )}
          </div>
        );
      })}
      <Button type="button" size="sm" variant="outline" onClick={addOption}>
        Add Option
      </Button>
    </div>
  );
}

// ─── True/False Editor ──────────────────────────────────────────────────────

interface TfEditorProps {
  correctAnswer: unknown;
  onChange: (correctAnswer: unknown) => void;
}

function TfEditor({ correctAnswer, onChange }: TfEditorProps) {
  return (
    <div className={styles.optionEditor}>
      <label className={styles.optionLabel}>Correct Answer</label>
      <div className={styles.tfGroup}>
        <label className={styles.tfOption}>
          <input
            type="radio"
            name="tfAnswer"
            checked={correctAnswer === 'true'}
            onChange={() => onChange('true')}
          />
          True
        </label>
        <label className={styles.tfOption}>
          <input
            type="radio"
            name="tfAnswer"
            checked={correctAnswer === 'false'}
            onChange={() => onChange('false')}
          />
          False
        </label>
      </div>
    </div>
  );
}

// ─── Slider Editor ──────────────────────────────────────────────────────────

interface SliderEditorProps {
  options: Record<string, unknown>;
  correctAnswer: unknown;
  onChange: (options: Record<string, unknown>, correctAnswer: unknown) => void;
}

function SliderEditor({ options, correctAnswer, onChange }: SliderEditorProps) {
  const answer = (correctAnswer as Record<string, number>) || { value: 50, tolerance: 5 };

  return (
    <div className={styles.optionEditor}>
      <label className={styles.optionLabel}>Slider Configuration</label>
      <div className={styles.sliderGrid}>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Min</label>
          <input
            type="number"
            value={Number(options.min ?? 0)}
            onChange={(e) => onChange({ ...options, min: Number(e.target.value) }, correctAnswer)}
            className={styles.optionInput}
          />
        </div>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Max</label>
          <input
            type="number"
            value={Number(options.max ?? 100)}
            onChange={(e) => onChange({ ...options, max: Number(e.target.value) }, correctAnswer)}
            className={styles.optionInput}
          />
        </div>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Step</label>
          <input
            type="number"
            value={Number(options.step ?? 1)}
            onChange={(e) => onChange({ ...options, step: Number(e.target.value) }, correctAnswer)}
            className={styles.optionInput}
          />
        </div>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Unit</label>
          <input
            type="text"
            value={String(options.unit ?? '')}
            onChange={(e) => onChange({ ...options, unit: e.target.value }, correctAnswer)}
            className={styles.optionInput}
          />
        </div>
      </div>
      <label className={styles.optionLabel}>Correct Answer</label>
      <div className={styles.sliderGrid}>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Value</label>
          <input
            type="number"
            value={answer.value ?? 50}
            onChange={(e) => onChange(options, { ...answer, value: Number(e.target.value) })}
            className={styles.optionInput}
          />
        </div>
        <div className={styles.sliderField}>
          <label className={styles.smallLabel}>Tolerance (+/-)</label>
          <input
            type="number"
            value={answer.tolerance ?? 5}
            onChange={(e) => onChange(options, { ...answer, tolerance: Number(e.target.value) })}
            className={styles.optionInput}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main QuestionEditor ────────────────────────────────────────────────────

export function QuestionEditor({ bankId, question, isOpen, onClose }: QuestionEditorProps) {
  const queryClient = useQueryClient();
  const isEditing = !!question;

  const [options, setOptions] = useState<IQuestionOption[] | Record<string, unknown>>(
    question?.options ?? getDefaultOptions(QuestionType.MULTIPLE_CHOICE_SINGLE)
  );
  const [correctAnswer, setCorrectAnswer] = useState<unknown>(
    question?.correctAnswer ?? getDefaultCorrectAnswer(QuestionType.MULTIPLE_CHOICE_SINGLE)
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
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
      setCorrectAnswer(question.correctAnswer);
    } else {
      reset({
        type: QuestionType.MULTIPLE_CHOICE_SINGLE,
        prompt: '',
        feedback: '',
        referenceLink: '',
      });
      setOptions(getDefaultOptions(QuestionType.MULTIPLE_CHOICE_SINGLE));
      setCorrectAnswer(getDefaultCorrectAnswer(QuestionType.MULTIPLE_CHOICE_SINGLE));
    }
  }, [question, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: QuestionFormData) => {
      const payload = {
        ...data,
        options: options as object,
        correctAnswer: correctAnswer as object,
        referenceLink: data.referenceLink || null,
      };
      return isEditing
        ? updateQuestion(question!.id, payload)
        : createQuestion(bankId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', bankId] });
      queryClient.invalidateQueries({ queryKey: ['questionBank', bankId] });
      onClose();
    },
  });

  function onSubmit(data: QuestionFormData) {
    saveMutation.mutate(data);
  }

  function handleOptionsChange(
    newOptions: IQuestionOption[] | Record<string, unknown>,
    newCorrectAnswer: unknown
  ) {
    setOptions(newOptions);
    setCorrectAnswer(newCorrectAnswer);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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

        {(questionType === QuestionType.DRAG_ORDER ||
          questionType === QuestionType.IMAGE_MAP) && (
          <div className={styles.placeholder}>
            <p>
              {questionType === QuestionType.DRAG_ORDER
                ? 'Drag-to-order editor coming soon.'
                : 'Image map editor coming soon.'}
            </p>
          </div>
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

        <Input
          label="Reference Link"
          type="url"
          {...register('referenceLink')}
          error={errors.referenceLink?.message}
          helpText="Optional URL for further reading"
        />

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onClose}>
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
