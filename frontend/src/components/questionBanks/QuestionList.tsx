/**
 * @file        QuestionList
 * @description List of questions within a question bank with CRUD operations
 */

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@dnd-kit/sortable';
import { listQuestions, deleteQuestion, duplicateQuestion, reorderQuestions } from '@/services/questionApi';
import { QuestionListItem } from './QuestionListItem';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import { queryKeys } from '@/lib/queryKeys';
import type { IQuestion } from '@/types';
import styles from './QuestionList.module.css';

type SortField = 'order' | 'type' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface QuestionListProps {
  bankId: string;
  onEditQuestion: (question: IQuestion) => void;
  onAddQuestion: () => void;
}

export function QuestionList({ bankId, onEditQuestion, onAddQuestion }: QuestionListProps) {
  const queryClient = useQueryClient();
  const [sortField, setSortField] = useState<SortField>('order');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.questions(bankId),
    queryFn: () => listQuestions(bankId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(bankId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank(bankId) });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(bankId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank(bankId) });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (questionIds: string[]) => reorderQuestions(bankId, questionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(bankId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank(bankId) });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const questions = data ?? [];

  const sorted = useMemo(() => {
    const copy = [...questions];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'order') cmp = a.order - b.order;
      else if (sortField === 'type') cmp = a.type.localeCompare(b.type);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [questions, sortField, sortDir]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">Failed to load questions. Please try again.</Alert>
    );
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((q) => q.id === active.id);
    const newIndex = sorted.findIndex((q) => q.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically reorder in cache
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    queryClient.setQueryData(queryKeys.questions(bankId), reordered);

    // Call API with new order
    reorderMutation.mutate(reordered.map((q) => q.id));
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Questions ({questions.length})
        </h2>
        <Button size="sm" onClick={onAddQuestion}>
          Add Question
        </Button>
      </div>

      {questions.length > 1 && (
        <div className={styles.sortBar}>
          <span className={styles.sortLabel}>Sort by:</span>
          {([['order', 'Order'], ['type', 'Type'], ['createdAt', 'Date']] as const).map(
            ([field, label]) => (
              <button
                key={field}
                type="button"
                className={`${styles.sortBtn} ${sortField === field ? styles.sortBtnActive : ''}`}
                onClick={() => toggleSort(field)}
                aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                aria-label={`Sort by ${label} ${sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : ''}`}
              >
                {label} {sortField === field && (sortDir === 'asc' ? '\u2191' : '\u2193')}
              </button>
            ),
          )}
        </div>
      )}

      {deleteMutation.error && (
        <Alert variant="error" className={styles.alert}>
          Failed to delete question.
        </Alert>
      )}

      {questions.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            No questions yet. Add your first question to get started.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sorted.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <div className={styles.list}>
              {sorted.map((question, index) => (
                <QuestionListItem
                  key={question.id}
                  question={question}
                  index={index}
                  onEdit={onEditQuestion}
                  onDuplicate={(id) => duplicateMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isDuplicating={
                    duplicateMutation.isPending &&
                    duplicateMutation.variables === question.id
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
