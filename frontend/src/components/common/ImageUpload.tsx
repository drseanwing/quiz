/**
 * @file        ImageUpload component
 * @description Reusable image upload with preview
 */

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadImage, deleteImage } from '@/services/uploadApi';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: uploadImage,
    onSuccess: (result) => {
      setError(null);
      onChange(result.url);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Upload failed');
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File exceeds 5MB limit');
      return;
    }

    upload.mutate(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function handleRemove() {
    if (value) {
      const filename = value.split('/').pop();
      if (filename) {
        deleteImage(filename).catch(() => {});
      }
    }
    onChange('');
  }

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}

      {value ? (
        <div className={styles.preview}>
          <img src={value} alt="" className={styles.image} />
          <button
            type="button"
            className={styles.remove}
            onClick={handleRemove}
            aria-label="Remove image"
          >
            &times;
          </button>
        </div>
      ) : (
        <div className={styles.dropzone} onClick={() => inputRef.current?.click()}>
          <span className={styles.dropzoneText}>
            {upload.isPending ? 'Uploading...' : 'Click to upload image'}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className={styles.hidden}
      />

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
