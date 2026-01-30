/**
 * @file        ExportButton
 * @description Button to export a question bank as JSON file
 */

import { useMutation } from '@tanstack/react-query';
import { exportQuestionBank } from '@/services/questionBankApi';
import { Button } from '@/components/common/Button';

interface ExportButtonProps {
  bankId: string;
  bankTitle: string;
}

export function ExportButton({ bankId, bankTitle }: ExportButtonProps) {
  const exportMutation = useMutation({
    mutationFn: () => exportQuestionBank(bankId),
    onSuccess: (data) => {
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
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportMutation.mutate()}
      loading={exportMutation.isPending}
    >
      Export
    </Button>
  );
}
