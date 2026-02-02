/**
 * @file        ProfilePage component
 * @description User profile management with edit forms and password change
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';
import { updateProfile, changePassword, type IUpdateProfileRequest, type IChangePasswordRequest } from '@/services/userApi';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const { user } = useAuth();
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    surname: user?.surname || '',
    idNumber: user?.idNumber || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = useState('');

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: (data: IUpdateProfileRequest) => updateProfile(data),
    onSuccess: (updatedUser) => {
      toast.success('Profile updated successfully');
      // Update the auth context with new user data
      // Note: auth context uses local state, not TanStack Query, so no invalidation needed
      // The form already updates from the mutation response above
      setProfileForm({
        firstName: updatedUser.firstName,
        surname: updatedUser.surname,
        idNumber: updatedUser.idNumber || '',
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(message);
    },
  });

  // Password change mutation
  const passwordMutation = useMutation({
    mutationFn: (data: IChangePasswordRequest) => changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordError('');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      setPasswordError(message);
    },
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    profileMutation.mutate({
      firstName: profileForm.firstName,
      surname: profileForm.surname,
      idNumber: profileForm.idNumber || undefined,
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    // Validation
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <Alert variant="error">Please log in to view your profile</Alert>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Profile</h1>

      <div className={styles.grid}>
        {/* Profile Information Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile Information</h2>

          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email:</span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Role:</span>
              <span className={styles.infoValue}>{user.role}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Member since:</span>
              <span className={styles.infoValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className={styles.form}>
            <Input
              label="First Name"
              type="text"
              value={profileForm.firstName}
              onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
              required
            />

            <Input
              label="Surname"
              type="text"
              value={profileForm.surname}
              onChange={(e) => setProfileForm({ ...profileForm, surname: e.target.value })}
              required
            />

            <Input
              label="ID Number"
              type="text"
              value={profileForm.idNumber}
              onChange={(e) => setProfileForm({ ...profileForm, idNumber: e.target.value })}
              helpText="Optional identification number"
            />

            <Button
              type="submit"
              loading={profileMutation.isPending}
              disabled={
                profileForm.firstName === user.firstName &&
                profileForm.surname === user.surname &&
                profileForm.idNumber === (user.idNumber || '')
              }
            >
              Update Profile
            </Button>
          </form>
        </section>

        {/* Password Change Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Change Password</h2>

          {passwordError && (
            <Alert variant="error" className={styles.alert}>
              {passwordError}
            </Alert>
          )}

          <form onSubmit={handlePasswordSubmit} className={styles.form}>
            <Input
              label="Current Password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
            />

            <Input
              label="New Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              helpText="Must be at least 8 characters"
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
            />

            <Button
              type="submit"
              loading={passwordMutation.isPending}
              variant="secondary"
            >
              Change Password
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
