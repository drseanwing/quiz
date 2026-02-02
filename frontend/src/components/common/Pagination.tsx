import { Button } from './Button';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount?: number;
  label?: string;
}

export function Pagination({ page, totalPages, onPageChange, totalCount, label }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className={styles.pagination} role="navigation" aria-label={label || 'Pagination'}>
      <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Prev</Button>
      <span>Page {page} of {totalPages}{totalCount !== undefined ? ` (${totalCount} total)` : ''}</span>
      <Button variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next</Button>
    </div>
  );
}
