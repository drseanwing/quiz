/**
 * @file        ForgotPasswordForm component
 * @description Request password reset email
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
import styles from './ForgotPasswordForm.module.css';

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setError(null);
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', data);
      setIsSubmitted(true);
    } catch (err) {
      // Always show success to prevent email enumeration
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className={styles.form}>
        <Alert variant="success">
          If an account exists with that email address, a password reset link has been sent.
          Please check your email.
        </Alert>

        <div className={styles.footer}>
          <Link to="/login" className={styles.link}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className={styles.description}>
        Enter your email address and we will send you a link to reset your password.
      </p>

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        required
        {...register('email')}
      />

      <div className={styles.footer}>
        <Button type="submit" fullWidth loading={isLoading}>
          Send Reset Link
        </Button>

        <Link to="/login" className={styles.link}>
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
