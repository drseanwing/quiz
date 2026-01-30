/**
 * @file        LoginForm component
 * @description User login form with email and password
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';
import styles from './LoginForm.module.css';

const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, error, clearError, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    clearError();
    await login(data);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && (
        <Alert variant="error" onDismiss={clearError}>
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

      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        required
        {...register('password')}
      />

      <div className={styles.footer}>
        <Button type="submit" fullWidth loading={isLoading}>
          Sign In
        </Button>

        <Link to="/forgot-password" className={styles.link}>
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}
