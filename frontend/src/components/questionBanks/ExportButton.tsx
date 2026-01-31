/**
 * @file        ExportButton
 * @description Button to export a question bank as JSON file
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportQuestionBank } from '@/services/questionBankApi';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';

interface ExportButtonProps {
  bankId: string;
  bankTitle: string;
}

export function ExportButton({ bankId, bankTitle }: ExportButtonProps) {
  const [exportError, setExportError] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: () => exportQuestionBank(bankId),
    onSuccess: (data) => {
      setExportError(null);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bankTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: () => {
      setExportError('Failed to export question bank. Please try again.');
    },
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportMutation.mutate()}
        loading={exportMutation.isPending}
      >
        Export
      </Button>
      {exportError && <Alert variant="error" onDismiss={() => setExportError(null)}>{exportError}</Alert>}
    </>
  );
}
