/**
 * @file        RegisterForm component
 * @description User registration form
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';
import styles from './RegisterForm.module.css';

const registerSchema = z.object({
  email: z
    .string()
    .email('Valid email address is required')
    .refine(
      (email) => email.endsWith('@health.qld.gov.au'),
      'Email must be from @health.qld.gov.au domain'
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be at most 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  surname: z
    .string()
    .min(1, 'Surname is required')
    .max(100, 'Surname must be at most 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Surname contains invalid characters'),
  idNumber: z
    .string()
    .max(50, 'ID number must be at most 50 characters')
    .optional()
    .or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { register: registerUser, error, clearError, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    clearError();
    await registerUser({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      surname: data.surname,
      idNumber: data.idNumber || undefined,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && (
        <Alert variant="error" onDismiss={clearError}>
          {error}
        </Alert>
      )}

      <div className={styles.row}>
        <Input
          label="First Name"
          autoComplete="given-name"
          error={errors.firstName?.message}
          required
          {...register('firstName')}
        />

        <Input
          label="Surname"
          autoComplete="family-name"
          error={errors.surname?.message}
          required
          {...register('surname')}
        />
      </div>

      <div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          required
          {...register('email')}
        />
        <p className={styles.domainHint}>
          Must use your @health.qld.gov.au email address
        </p>
      </div>

      <Input
        label="ID Number"
        helpText="Optional - your staff ID or payroll number"
        error={errors.idNumber?.message}
        {...register('idNumber')}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        required
        {...register('password')}
      />

      <Input
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        required
        {...register('confirmPassword')}
      />

      <div className={styles.footer}>
        <Button type="submit" fullWidth loading={isLoading}>
          Create Account
        </Button>

        <Link to="/login" className={styles.link}>
          Already have an account? Sign in
        </Link>
      </div>
    </form>
  );
}
