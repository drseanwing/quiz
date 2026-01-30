/**
 * @file        ResetPasswordForm component
 * @description Complete password reset with token
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';
import styles from './ResetPasswordForm.module.css';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordFormData) {
    setError(null);
    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to reset password. The link may be expired or invalid.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className={styles.form}>
        <Alert variant="success">
          Your password has been reset successfully. You can now sign in with your new password.
        </Alert>

        <div className={styles.footer}>
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Input
        label="New Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        required
        {...register('password')}
      />

      <Input
        label="Confirm New Password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        required
        {...register('confirmPassword')}
      />

      <div className={styles.footer}>
        <Button type="submit" fullWidth loading={isLoading}>
          Reset Password
        </Button>

        <Link to="/login" className={styles.link}>
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
