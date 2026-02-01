/**
 * @file        QuestionList
 * @description List of questions within a question bank with CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listQuestions, deleteQuestion, duplicateQuestion } from '@/services/questionApi';
import { QuestionListItem } from './QuestionListItem';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Alert } from '@/components/common/Alert';
import type { IQuestion } from '@/types';
import styles from './QuestionList.module.css';

interface QuestionListProps {
  bankId: string;
  onEditQuestion: (question: IQuestion) => void;
  onAddQuestion: () => void;
}

export function QuestionList({ bankId, onEditQuestion, onAddQuestion }: QuestionListProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['questions', bankId],
    queryFn: () => listQuestions(bankId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', bankId] });
      queryClient.invalidateQueries({ queryKey: ['questionBank', bankId] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', bankId] });
      queryClient.invalidateQueries({ queryKey: ['questionBank', bankId] });
    },
  });

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

  const questions = data ?? [];

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
        <div className={styles.list}>
          {questions.map((question, index) => (
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
      )}
    </div>
  );
}
