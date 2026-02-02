/**
 * @file        McOptionEditor
 * @description Multiple-choice option editor (single & multi select)
 */

import { Button } from '@/components/common/Button';
import type { IQuestionOption } from '@/types';
import styles from './QuestionEditor.module.css';

export interface McOptionEditorProps {
  options: IQuestionOption[];
  correctAnswer: unknown;
  isMulti: boolean;
  onChange: (options: IQuestionOption[], correctAnswer: unknown) => void;
}

export function McOptionEditor({ options, correctAnswer, isMulti, onChange }: McOptionEditorProps) {
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
