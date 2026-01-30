/**
 * @file        Type definitions
 * @description Shared TypeScript types and interfaces for the REdI Quiz Platform
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum UserRole {
  USER = 'USER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

export enum QuestionBankStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PUBLIC = 'PUBLIC',
  ARCHIVED = 'ARCHIVED',
}

export enum FeedbackTiming {
  IMMEDIATE = 'IMMEDIATE',
  END = 'END',
  NONE = 'NONE',
}

export enum QuestionType {
  MULTIPLE_CHOICE_SINGLE = 'MULTIPLE_CHOICE_SINGLE',
  MULTIPLE_CHOICE_MULTI = 'MULTIPLE_CHOICE_MULTI',
  TRUE_FALSE = 'TRUE_FALSE',
  DRAG_ORDER = 'DRAG_ORDER',
  IMAGE_MAP = 'IMAGE_MAP',
  SLIDER = 'SLIDER',
}

export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  TIMED_OUT = 'TIMED_OUT',
  ABANDONED = 'ABANDONED',
}

// ─── User Types ─────────────────────────────────────────────────────────────

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  idNumber: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  surname: string;
  idNumber?: string;
}

export interface IAuthResponse {
  user: IUser;
  tokens: ITokenPair;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IPasswordResetRequest {
  email: string;
}

export interface IPasswordResetCompletion {
  token: string;
  password: string;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface IApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: IPaginationMeta;
}

export interface IApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface IPaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// ─── Question Bank Types ────────────────────────────────────────────────────

export interface IQuestionBank {
  id: string;
  title: string;
  description: string | null;
  status: QuestionBankStatus;
  timeLimit: number;
  randomQuestions: boolean;
  randomAnswers: boolean;
  passingScore: number;
  feedbackTiming: FeedbackTiming;
  notificationEmail: string | null;
  questionCount: number;
  maxAttempts: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Question Types ─────────────────────────────────────────────────────────

export interface IQuestionOption {
  id: string;
  text: string;
  image?: string;
}

export interface IQuestion {
  id: string;
  bankId: string;
  type: QuestionType;
  prompt: string;
  promptImage: string | null;
  options: IQuestionOption[] | Record<string, unknown>;
  correctAnswer: unknown;
  feedback: string;
  feedbackImage: string | null;
  referenceLink: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Quiz Attempt Types ─────────────────────────────────────────────────────

export interface IQuizAttempt {
  id: string;
  userId: string;
  bankId: string;
  status: AttemptStatus;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
  timeSpent: number;
  questionOrder: string[];
  responses: IQuizResponse[];
}

export interface IQuizResponse {
  questionId: string;
  answer: unknown;
  answeredAt: string;
}

export interface IQuizResult {
  attempt: IQuizAttempt;
  bank: IQuestionBank;
  questions: IQuestion[];
}
