/**
 * @file        Page component tests
 * @description Tests for DashboardPage, QuizListPage, and QuizResultsPage
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttemptStatus, UserRole, QuestionType, FeedbackTiming, type IAttemptSummary } from '@/types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
let mockParams: Record<string, string> = {};
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockParams };
});

const mockAuth = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  error: null as string | null,
  clearError: vi.fn(),
  isLoading: false,
  isAuthenticated: true,
  isRestoring: false,
  user: { id: 'u1', firstName: 'Alice', surname: 'Smith', email: 'alice@test.com', role: 'USER' as UserRole },
  logout: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }));

const mockQuizApi = vi.hoisted(() => ({
  startQuiz: vi.fn(),
  getAttempt: vi.fn(),
  saveProgress: vi.fn(),
  submitAttempt: vi.fn(),
  getResults: vi.fn(),
  listMyAttempts: vi.fn(),
}));
vi.mock('@/services/quizApi', () => mockQuizApi);

const mockBankApi = vi.hoisted(() => ({
  listQuestionBanks: vi.fn(),
  getQuestionBank: vi.fn(),
  createQuestionBank: vi.fn(),
  updateQuestionBank: vi.fn(),
  deleteQuestionBank: vi.fn(),
  duplicateQuestionBank: vi.fn(),
}));
vi.mock('@/services/questionBankApi', () => mockBankApi);
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn() }, api: { get: vi.fn(), post: vi.fn() } }));

import { DashboardPage } from '@/pages/DashboardPage';
import { QuizListPage } from '@/pages/quiz/QuizListPage';
import { QuizResultsPage } from '@/pages/quiz/QuizResultsPage';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

function makeAttempt(overrides: Partial<IAttemptSummary> = {}): IAttemptSummary {
  return {
    id: 'a1',
    bankId: 'b1',
    bankTitle: 'Test Quiz',
    status: AttemptStatus.COMPLETED,
    score: 8,
    maxScore: 10,
    percentage: 80,
    passed: true,
    timeSpent: 300,
    startedAt: '2026-01-15T10:00:00Z',
    completedAt: '2026-01-15T10:30:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.user = { id: 'u1', firstName: 'Alice', surname: 'Smith', email: 'alice@test.com', role: 'USER' as UserRole };
  mockAuth.error = null;
  mockParams = {};
});

// ─── DashboardPage ──────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  it('shows spinner while loading', () => {
    mockQuizApi.listMyAttempts.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows welcome message with user name', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/welcome back, alice/i)).toBeInTheDocument();
    });
  });

  it('shows stats for completed attempts', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([
      makeAttempt({ id: 'a1', percentage: 80 }),
      makeAttempt({ id: 'a2', percentage: 60, passed: false }),
    ]);
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Quizzes Completed
      expect(screen.getByText('1')).toBeInTheDocument(); // Quizzes Passed
      expect(screen.getByText('70%')).toBeInTheDocument(); // Average Score
    });
  });

  it('shows error alert when API fails', async () => {
    mockQuizApi.listMyAttempts.mockRejectedValue(new Error('fail'));
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i);
    });
  });

  it('hides stats when there is an error', async () => {
    mockQuizApi.listMyAttempts.mockRejectedValue(new Error('fail'));
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.queryByText('Quizzes Completed')).not.toBeInTheDocument();
  });

  it('shows Browse Quizzes button', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /browse quizzes/i })).toBeInTheDocument();
    });
  });

  it('navigates to quizzes on Browse Quizzes click', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />);
    const user = userEvent.setup();
    await waitFor(() => screen.getByRole('button', { name: /browse quizzes/i }));
    await user.click(screen.getByRole('button', { name: /browse quizzes/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/quizzes');
  });

  it('shows Manage Question Banks for editors', async () => {
    mockAuth.user = { ...mockAuth.user!, role: 'EDITOR' as UserRole };
    mockQuizApi.listMyAttempts.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /manage question banks/i })).toBeInTheDocument();
    });
  });

  it('hides Manage Question Banks for regular users', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />);
    await waitFor(() => screen.getByRole('button', { name: /browse quizzes/i }));
    expect(screen.queryByRole('button', { name: /manage question banks/i })).not.toBeInTheDocument();
  });

  it('shows in-progress attempts section', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([
      makeAttempt({ id: 'ip1', status: AttemptStatus.IN_PROGRESS, bankTitle: 'Ongoing Quiz', passed: false, percentage: 0, completedAt: null }),
    ]);
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Continue Where You Left Off')).toBeInTheDocument();
      expect(screen.getByText('Ongoing Quiz')).toBeInTheDocument();
    });
  });

  it('shows empty state when no completed attempts', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/no completed quizzes yet/i)).toBeInTheDocument();
    });
  });

  it('shows recent results with pass/fail status', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([
      makeAttempt({ id: 'a1', bankTitle: 'Quiz A', percentage: 90, passed: true }),
      makeAttempt({ id: 'a2', bankTitle: 'Quiz B', percentage: 40, passed: false }),
    ]);
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Quiz A')).toBeInTheDocument();
      expect(screen.getByText('Quiz B')).toBeInTheDocument();
      expect(screen.getByText(/90% - passed/i)).toBeInTheDocument();
      expect(screen.getByText(/40% - not passed/i)).toBeInTheDocument();
    });
  });
});

// ─── QuizListPage ───────────────────────────────────────────────────────────

describe('QuizListPage', () => {
  beforeEach(() => {
    mockBankApi.listQuestionBanks.mockResolvedValue({ banks: [], meta: { page: 1, pageSize: 100, totalCount: 0, totalPages: 0 } });
    mockQuizApi.listMyAttempts.mockResolvedValue([]);
  });

  it('shows loading spinner while fetching', () => {
    mockBankApi.listQuestionBanks.mockReturnValue(new Promise(() => {}));
    mockQuizApi.listMyAttempts.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<QuizListPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state when no quizzes available', async () => {
    renderWithProviders(<QuizListPage />);
    await waitFor(() => {
      expect(screen.getByText(/no quizzes are currently available/i)).toBeInTheDocument();
    });
  });

  it('renders quiz cards with bank info', async () => {
    mockBankApi.listQuestionBanks.mockResolvedValue({
      banks: [
        { id: 'b1', title: 'Safety Quiz', description: 'Test your safety knowledge', questionCount: 10, timeLimit: 30, maxAttempts: 3, status: 'OPEN' },
        { id: 'b2', title: 'Policy Quiz', description: null, questionCount: 5, timeLimit: 0, maxAttempts: 0, status: 'OPEN' },
      ],
      meta: { page: 1, pageSize: 100, totalCount: 2, totalPages: 1 },
    });
    renderWithProviders(<QuizListPage />);
    await waitFor(() => {
      expect(screen.getByText('Safety Quiz')).toBeInTheDocument();
      expect(screen.getByText('Test your safety knowledge')).toBeInTheDocument();
      expect(screen.getByText('10 questions')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('Policy Quiz')).toBeInTheDocument();
      expect(screen.getByText('5 questions')).toBeInTheDocument();
    });
  });

  it('shows Start Quiz buttons for each bank', async () => {
    mockBankApi.listQuestionBanks.mockResolvedValue({
      banks: [{ id: 'b1', title: 'Quiz', questionCount: 5, timeLimit: 0, maxAttempts: 0, status: 'OPEN' }],
      meta: { page: 1, pageSize: 100, totalCount: 1, totalPages: 1 },
    });
    renderWithProviders(<QuizListPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start quiz/i })).toBeInTheDocument();
    });
  });

  it('shows Resume button for in-progress attempts', async () => {
    mockBankApi.listQuestionBanks.mockResolvedValue({
      banks: [{ id: 'b1', title: 'Quiz', questionCount: 5, timeLimit: 0, maxAttempts: 0, status: 'OPEN' }],
      meta: { page: 1, pageSize: 100, totalCount: 1, totalPages: 1 },
    });
    mockQuizApi.listMyAttempts.mockResolvedValue([
      makeAttempt({ id: 'a1', bankId: 'b1', status: AttemptStatus.IN_PROGRESS, passed: false, percentage: 0, completedAt: null }),
    ]);
    renderWithProviders(<QuizListPage />);
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /resume/i });
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('shows best score for completed attempts', async () => {
    mockBankApi.listQuestionBanks.mockResolvedValue({
      banks: [{ id: 'b1', title: 'Quiz', questionCount: 5, timeLimit: 0, maxAttempts: 0, status: 'OPEN' }],
      meta: { page: 1, pageSize: 100, totalCount: 1, totalPages: 1 },
    });
    mockQuizApi.listMyAttempts.mockResolvedValue([
      makeAttempt({ id: 'a1', bankId: 'b1', percentage: 60 }),
      makeAttempt({ id: 'a2', bankId: 'b1', percentage: 90 }),
    ]);
    renderWithProviders(<QuizListPage />);
    await waitFor(() => {
      expect(screen.getByText(/best score: 90%/i)).toBeInTheDocument();
    });
  });

  it('shows attempt count for limited-attempt banks', async () => {
    mockBankApi.listQuestionBanks.mockResolvedValue({
      banks: [{ id: 'b1', title: 'Quiz', questionCount: 5, timeLimit: 0, maxAttempts: 3, status: 'OPEN' }],
      meta: { page: 1, pageSize: 100, totalCount: 1, totalPages: 1 },
    });
    mockQuizApi.listMyAttempts.mockResolvedValue([
      makeAttempt({ id: 'a1', bankId: 'b1' }),
    ]);
    renderWithProviders(<QuizListPage />);
    await waitFor(() => {
      expect(screen.getByText('1/3 attempts')).toBeInTheDocument();
    });
  });

  it('shows attempt history table', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([
      makeAttempt({ id: 'a1', bankTitle: 'Past Quiz', percentage: 75, passed: true }),
    ]);
    renderWithProviders(<QuizListPage />);
    await waitFor(() => {
      expect(screen.getByText('Your Attempt History')).toBeInTheDocument();
      expect(screen.getByText('Past Quiz')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Passed')).toBeInTheDocument();
    });
  });

  it('shows start error and allows dismissal', async () => {
    mockBankApi.listQuestionBanks.mockResolvedValue({
      banks: [{ id: 'b1', title: 'Quiz', questionCount: 5, timeLimit: 0, maxAttempts: 0, status: 'OPEN' }],
      meta: { page: 1, pageSize: 100, totalCount: 1, totalPages: 1 },
    });
    mockQuizApi.startQuiz.mockRejectedValue(new Error('Max attempts reached'));
    renderWithProviders(<QuizListPage />);
    const user = userEvent.setup();

    await waitFor(() => screen.getByRole('button', { name: /start quiz/i }));
    await user.click(screen.getByRole('button', { name: /start quiz/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Max attempts reached');
    });

    // Dismiss the error
    await user.click(screen.getByLabelText('Dismiss alert'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('navigates to quiz player when starting quiz', async () => {
    mockBankApi.listQuestionBanks.mockResolvedValue({
      banks: [{ id: 'b1', title: 'Quiz', questionCount: 5, timeLimit: 0, maxAttempts: 0, status: 'OPEN' }],
      meta: { page: 1, pageSize: 100, totalCount: 1, totalPages: 1 },
    });
    mockQuizApi.startQuiz.mockResolvedValue({ attemptId: 'new-attempt-1' });
    renderWithProviders(<QuizListPage />);
    const user = userEvent.setup();

    await waitFor(() => screen.getByRole('button', { name: /start quiz/i }));
    await user.click(screen.getByRole('button', { name: /start quiz/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/quiz/new-attempt-1');
    });
  });

  it('shows Continue section for in-progress attempts', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([
      makeAttempt({ id: 'ip1', status: AttemptStatus.IN_PROGRESS, bankTitle: 'Ongoing', passed: false, percentage: 0, completedAt: null }),
    ]);
    renderWithProviders(<QuizListPage />);
    await waitFor(() => {
      expect(screen.getByText('Continue Where You Left Off')).toBeInTheDocument();
      expect(screen.getByText('Ongoing')).toBeInTheDocument();
    });
  });

  it('shows Timed Out status in attempt history', async () => {
    mockQuizApi.listMyAttempts.mockResolvedValue([
      makeAttempt({ id: 'a1', status: AttemptStatus.TIMED_OUT, bankTitle: 'Timed Quiz', passed: false, percentage: 30 }),
    ]);
    renderWithProviders(<QuizListPage />);
    await waitFor(() => {
      expect(screen.getByText('Timed Out')).toBeInTheDocument();
    });
  });
});

// ─── QuizResultsPage ────────────────────────────────────────────────────────

function makeResults(overrides: Record<string, unknown> = {}) {
  return {
    bankTitle: 'Safety Quiz',
    status: 'COMPLETED',
    passed: true,
    percentage: 80,
    score: 8,
    maxScore: 10,
    timeSpent: 185,
    feedbackTiming: FeedbackTiming.END,
    questions: [
      {
        id: 'q1',
        type: QuestionType.TRUE_FALSE,
        prompt: '<p>Is fire hot?</p>',
        promptImage: null,
        options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
        userResponse: { value: true },
        correctAnswer: { value: true },
        feedback: 'Correct! Fire is hot.',
        feedbackImage: null,
        referenceLink: null,
        score: 1,
        isCorrect: true,
      },
      {
        id: 'q2',
        type: QuestionType.MULTIPLE_CHOICE_SINGLE,
        prompt: '<p>What color is the sky?</p>',
        promptImage: null,
        options: [{ id: 'a', text: 'Blue' }, { id: 'b', text: 'Green' }],
        userResponse: { optionId: 'b' },
        correctAnswer: { optionId: 'a' },
        feedback: 'The sky is blue.',
        feedbackImage: null,
        referenceLink: 'https://example.com/sky',
        score: 0,
        isCorrect: false,
      },
    ],
    ...overrides,
  };
}

describe('QuizResultsPage', () => {
  beforeEach(() => {
    mockParams = { attemptId: 'attempt-1' };
  });

  it('shows loading state', () => {
    mockQuizApi.getResults.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<QuizResultsPage />);
    expect(screen.getByText(/loading results/i)).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    mockQuizApi.getResults.mockRejectedValue(new Error('Not found'));
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Not found');
    });
    expect(screen.getByRole('button', { name: /back to quizzes/i })).toBeInTheDocument();
  });

  it('navigates back on error button click', async () => {
    mockQuizApi.getResults.mockRejectedValue(new Error('fail'));
    renderWithProviders(<QuizResultsPage />);
    const user = userEvent.setup();
    await waitFor(() => screen.getByRole('button', { name: /back to quizzes/i }));
    await user.click(screen.getByRole('button', { name: /back to quizzes/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/quizzes');
  });

  it('displays quiz title and completion status', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('Safety Quiz')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('shows Timed Out status for timed-out attempts', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults({ status: 'TIMED_OUT' }));
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('Timed Out')).toBeInTheDocument();
    });
  });

  it('displays score percentage and pass/fail', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('PASSED')).toBeInTheDocument();
    });
  });

  it('shows NOT PASSED for failing attempts', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults({ passed: false, percentage: 40 }));
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('NOT PASSED')).toBeInTheDocument();
    });
  });

  it('displays score points and time', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('8.0 / 10 points')).toBeInTheDocument();
      expect(screen.getByText('Time: 3m 5s')).toBeInTheDocument();
    });
  });

  it('renders question review cards for END feedback', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('Question Review')).toBeInTheDocument();
      expect(screen.getByText('Q1')).toBeInTheDocument();
      expect(screen.getByText('Q2')).toBeInTheDocument();
    });
  });

  it('shows correct/incorrect badges', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('Correct')).toBeInTheDocument();
      expect(screen.getByText('Incorrect')).toBeInTheDocument();
    });
  });

  it('shows user answers and correct answers', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('True')).toBeInTheDocument(); // user's T/F answer
      expect(screen.getByText('Green')).toBeInTheDocument(); // user's wrong MC answer
      expect(screen.getByText('Blue')).toBeInTheDocument(); // correct MC answer
    });
  });

  it('renders feedback text', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('Correct! Fire is hot.')).toBeInTheDocument();
      expect(screen.getByText('The sky is blue.')).toBeInTheDocument();
    });
  });

  it('renders reference link', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      const link = screen.getByText('Reference Link');
      expect(link).toHaveAttribute('href', 'https://example.com/sky');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('hides question review for NONE feedback timing', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults({ feedbackTiming: FeedbackTiming.NONE, questions: [] }));
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
    expect(screen.queryByText('Question Review')).not.toBeInTheDocument();
  });

  it('shows question type labels', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByText('True/False')).toBeInTheDocument();
      expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    });
  });

  it('shows Back to Quizzes footer button', async () => {
    mockQuizApi.getResults.mockResolvedValue(makeResults());
    renderWithProviders(<QuizResultsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to quizzes/i })).toBeInTheDocument();
    });
  });
});
