/**
 * @file        QuestionEditor
 * @description Modal editor for creating/editing individual questions
 */

import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createQuestion, updateQuestion } from '@/services/questionApi';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { ImageUpload } from '@/components/common/ImageUpload';
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

// ─── Multiple Choice Option Editor ──────────────────────────────────────────

interface McOptionEditorProps {
  options: IQuestionOption[];
  correctAnswer: unknown;
  isMulti: boolean;
  onChange: (options: IQuestionOption[], correctAnswer: unknown) => void;
}

function McOptionEditor({ options, correctAnswer, isMulti, onChange }: McOptionEditorProps) {
  function addOption() {
    const newId = crypto.randomUUID();
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
      <div className={styles.optionRow} style={{ marginTop: 'var(--space-sm)' }}>
        <input
          type="checkbox"
          id="showTicks"
          checked={Boolean(options.showTicks)}
          onChange={(e) => onChange({ ...options, showTicks: e.target.checked }, correctAnswer)}
          className={styles.optionRadio}
        />
        <label htmlFor="showTicks" className={styles.smallLabel}>Show tick marks on slider</label>
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

// ─── Drag Order Editor ─────────────────────────────────────────────────────

interface SortableEditorItemProps {
  id: string;
  text: string;
  index: number;
  onTextChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function SortableEditorItem({ id, text, index, onTextChange, onRemove, canRemove }: SortableEditorItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.optionRow}>
      <span className={styles.dragHandle} {...attributes} {...listeners}>&#x2630;</span>
      <span className={styles.orderIndex}>{index + 1}</span>
      <input
        type="text"
        value={text}
        onChange={(e) => onTextChange(id, e.target.value)}
        className={styles.optionInput}
      />
      {canRemove && (
        <button
          type="button"
          className={styles.removeOption}
          onClick={() => onRemove(id)}
          aria-label={`Remove item "${text}"`}
        >
          &times;
        </button>
      )}
    </div>
  );
}

interface DragOrderEditorProps {
  options: IQuestionOption[];
  correctAnswer: unknown;
  onChange: (options: IQuestionOption[], correctAnswer: unknown) => void;
}

function DragOrderEditor({ options, correctAnswer, onChange }: DragOrderEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function addItem() {
    const newId = crypto.randomUUID();
    const newOptions = [...options, { id: newId, text: `Item ${options.length + 1}` }];
    const answer = Array.isArray(correctAnswer) ? [...correctAnswer, newId] : newOptions.map(o => o.id);
    onChange(newOptions, answer);
  }

  function removeItem(id: string) {
    if (options.length <= 2) return;
    const filtered = options.filter(o => o.id !== id);
    const answer = Array.isArray(correctAnswer)
      ? (correctAnswer as string[]).filter(a => a !== id)
      : filtered.map(o => o.id);
    onChange(filtered, answer);
  }

  function updateText(id: string, text: string) {
    onChange(
      options.map(o => o.id === id ? { ...o, text } : o),
      correctAnswer
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = options.findIndex(o => o.id === active.id);
    const newIndex = options.findIndex(o => o.id === over.id);
    const reordered = arrayMove(options, oldIndex, newIndex);
    // Correct answer order matches the item display order
    onChange(reordered, reordered.map(o => o.id));
  }

  return (
    <div className={styles.optionEditor}>
      <label className={styles.optionLabel}>
        Items (drag to set correct order)
      </label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {options.map((opt, i) => (
            <SortableEditorItem
              key={opt.id}
              id={opt.id}
              text={opt.text}
              index={i}
              onTextChange={updateText}
              onRemove={removeItem}
              canRemove={options.length > 2}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="button" size="sm" variant="outline" onClick={addItem}>
        Add Item
      </Button>
    </div>
  );
}

// ─── Image Map Editor ──────────────────────────────────────────────────────

interface ImageRegion {
  id: string;
  type: 'circle' | 'rect';
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface ImageMapEditorProps {
  options: Record<string, unknown>;
  correctAnswer: unknown;
  onChange: (options: Record<string, unknown>, correctAnswer: unknown) => void;
}

function ImageMapEditor({ options, correctAnswer, onChange }: ImageMapEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const imageUrl = (options.image as string) || '';
  const regions = (options.regions as ImageRegion[]) || [];
  const correct = (correctAnswer as { regionId?: string }) || {};

  function setImageUrl(url: string) {
    onChange({ ...options, image: url }, correctAnswer);
  }

  function addRegion(type: 'circle' | 'rect') {
    const id = crypto.randomUUID();
    const newRegion: ImageRegion = type === 'circle'
      ? { id, type: 'circle', cx: 150, cy: 150, r: 50 }
      : { id, type: 'rect', x: 100, y: 100, width: 100, height: 80 };
    const newRegions = [...regions, newRegion];
    onChange({ ...options, regions: newRegions }, correctAnswer);
  }

  function updateRegion(id: string, field: string, value: number) {
    const updated = regions.map(r => r.id === id ? { ...r, [field]: value } : r);
    onChange({ ...options, regions: updated }, correctAnswer);
  }

  function removeRegion(id: string) {
    const filtered = regions.filter(r => r.id !== id);
    onChange(
      { ...options, regions: filtered },
      correct.regionId === id ? {} : correctAnswer
    );
  }

  function selectCorrect(regionId: string) {
    onChange(options, { regionId });
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    // If no regions, create one at click position
    if (regions.length === 0) {
      const id = crypto.randomUUID();
      const newRegion: ImageRegion = { id, type: 'circle', cx: x, cy: y, r: 40 };
      onChange({ ...options, regions: [newRegion] }, { regionId: id });
    }
  }

  return (
    <div className={styles.optionEditor}>
      <ImageUpload
        label="Image"
        value={imageUrl}
        onChange={setImageUrl}
      />

      {imageUrl && (
        <div className={styles.imageMapPreview}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Image map"
            className={styles.imageMapImage}
            onClick={handleImageClick}
          />
          <svg className={styles.imageMapOverlay}>
            {regions.map(r => {
              const isCorrect = correct.regionId === r.id;
              if (r.type === 'circle') {
                return (
                  <circle
                    key={r.id}
                    cx={r.cx}
                    cy={r.cy}
                    r={r.r}
                    fill={isCorrect ? 'rgba(0,180,160,0.3)' : 'rgba(100,100,100,0.2)'}
                    stroke={isCorrect ? 'var(--redi-teal)' : 'var(--redi-medium-gray)'}
                    strokeWidth="2"
                  />
                );
              }
              return (
                <rect
                  key={r.id}
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  fill={isCorrect ? 'rgba(0,180,160,0.3)' : 'rgba(100,100,100,0.2)'}
                  stroke={isCorrect ? 'var(--redi-teal)' : 'var(--redi-medium-gray)'}
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <Button type="button" size="sm" variant="outline" onClick={() => addRegion('circle')}>
          Add Circle Region
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addRegion('rect')}>
          Add Rectangle Region
        </Button>
      </div>

      {regions.length > 0 && (
        <>
          <label className={styles.optionLabel}>Regions</label>
          {regions.map((r, i) => (
            <div key={r.id} className={styles.optionRow}>
              <input
                type="radio"
                name="correctRegion"
                checked={correct.regionId === r.id}
                onChange={() => selectCorrect(r.id)}
                className={styles.optionRadio}
                aria-label={`Mark region ${i + 1} as correct`}
              />
              <span className={styles.smallLabel} style={{ minWidth: 80 }}>
                {r.type === 'circle' ? 'Circle' : 'Rect'} #{i + 1}
              </span>
              {r.type === 'circle' ? (
                <>
                  <input type="number" value={r.cx ?? 0} onChange={(e) => updateRegion(r.id, 'cx', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="cx" />
                  <input type="number" value={r.cy ?? 0} onChange={(e) => updateRegion(r.id, 'cy', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="cy" />
                  <input type="number" value={r.r ?? 0} onChange={(e) => updateRegion(r.id, 'r', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="r" />
                </>
              ) : (
                <>
                  <input type="number" value={r.x ?? 0} onChange={(e) => updateRegion(r.id, 'x', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="x" />
                  <input type="number" value={r.y ?? 0} onChange={(e) => updateRegion(r.id, 'y', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="y" />
                  <input type="number" value={r.width ?? 0} onChange={(e) => updateRegion(r.id, 'width', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="w" />
                  <input type="number" value={r.height ?? 0} onChange={(e) => updateRegion(r.id, 'height', Number(e.target.value))} className={styles.optionInput} style={{ width: 60 }} placeholder="h" />
                </>
              )}
              <button
                type="button"
                className={styles.removeOption}
                onClick={() => removeRegion(r.id)}
                aria-label={`Remove region ${i + 1}`}
              >
                &times;
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
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
      queryClient.invalidateQueries({ queryKey: ['questions', bankId] });
      queryClient.invalidateQueries({ queryKey: ['questionBank', bankId] });
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
