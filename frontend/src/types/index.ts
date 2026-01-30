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

// ─── Quiz Types ─────────────────────────────────────────────────────────────

/** Question as presented during quiz play (no correct answers) */
export interface IQuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  promptImage: string | null;
  options: unknown;
}

/** Response from starting a new quiz */
export interface IStartQuizResult {
  attemptId: string;
  bankTitle: string;
  timeLimit: number;
  questionCount: number;
  feedbackTiming: FeedbackTiming;
  questions: IQuizQuestion[];
}

/** Current state of an in-progress attempt */
export interface IAttemptState {
  id: string;
  bankId: string;
  bankTitle: string;
  status: AttemptStatus;
  startedAt: string;
  timeSpent: number;
  timeLimit: number;
  feedbackTiming: FeedbackTiming;
  questionCount: number;
  questions: IQuizQuestion[];
  responses: Record<string, unknown>;
}

/** Per-question result after scoring */
export interface IQuestionResult {
  id: string;
  type: QuestionType;
  prompt: string;
  promptImage: string | null;
  options: unknown;
  correctAnswer: unknown;
  feedback: string;
  feedbackImage: string | null;
  referenceLink: string | null;
  userResponse: unknown;
  score: number;
  isCorrect: boolean;
}

/** Full quiz results */
export interface IQuizResults {
  id: string;
  bankId: string;
  bankTitle: string;
  status: AttemptStatus;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  startedAt: string;
  completedAt: string | null;
  feedbackTiming: FeedbackTiming;
  questions: IQuestionResult[];
}

/** Response from save-progress */
export interface ISaveProgressResult {
  savedAt: string;
  immediateFeedback?: IImmediateFeedback[];
}

export interface IImmediateFeedback {
  questionId: string;
  correctAnswer: unknown;
  feedback: string;
  feedbackImage: string | null;
  score: number;
  isCorrect: boolean;
}

/** Attempt summary for listings */
export interface IAttemptSummary {
  id: string;
  bankId: string;
  bankTitle: string;
  status: AttemptStatus;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
  timeSpent: number;
}
