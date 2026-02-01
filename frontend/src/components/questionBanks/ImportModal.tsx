/**
 * @file        ImportModal
 * @description Modal for importing a question bank from JSON file
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importQuestionBank } from '@/services/questionBankApi';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import styles from './ImportModal.module.css';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<unknown>(null);

  const importMutation = useMutation({
    mutationFn: () => importQuestionBank(fileData),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['questionBanks'] });
      onClose();
      navigate(`/question-banks/${result.id}`);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError(null);
    setFileData(null);
    setFileName(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setParseError('Please select a JSON file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setParseError('File is too large. Maximum size is 10MB.');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.version || !parsed.bank || !Array.isArray(parsed.questions)) {
          setParseError('Invalid file format. Expected a question bank export file.');
          return;
        }
        setFileData(parsed);
      } catch {
        setParseError('Failed to parse JSON file. Please check the file format.');
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read file.');
    };
    reader.readAsText(file);
  }

  function handleClose() {
    setFileName(null);
    setParseError(null);
    setFileData(null);
    importMutation.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  }

  const apiError = importMutation.error as { response?: { data?: { error?: { message?: string; details?: { errors?: string[] } } } } } | null;
  const errorMessage = apiError?.response?.data?.error?.message;
  const validationErrors = apiError?.response?.data?.error?.details?.errors;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Question Bank">
      <div className={styles.content}>
        <p className={styles.description}>
          Upload a JSON file exported from this platform to create a new question bank.
          The imported bank will be created in Draft status.
        </p>

        <div className={styles.uploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className={styles.fileInput}
            id="import-file"
          />
          <label htmlFor="import-file" className={styles.uploadLabel}>
            {fileName ? fileName : 'Choose a JSON file...'}
          </label>
        </div>

        {parseError && (
          <Alert variant="error" className={styles.alert}>
            {parseError}
          </Alert>
        )}

        {importMutation.error && (
          <Alert variant="error" className={styles.alert}>
            {errorMessage || 'Import failed. Please check the file and try again.'}
            {validationErrors && validationErrors.length > 0 && (
              <ul className={styles.errorList}>
                {validationErrors.map((err, i) => (
                  <li key={i}>{String(err)}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}

        {!!fileData && !parseError && (
          <Alert variant="info" className={styles.alert}>
            Ready to import. This will create a new question bank.
          </Alert>
        )}

        <div className={styles.actions}>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            loading={importMutation.isPending}
            disabled={!fileData || !!parseError}
          >
            Import
          </Button>
        </div>
      </div>
    </Modal>
  );
}
