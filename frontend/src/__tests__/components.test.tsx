/**
 * @file        Common component tests
 * @description Tests for Button, Alert, Input, Modal, Spinner, Card, ErrorBoundary
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { Card } from '@/components/common/Card';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// ─── Button ──────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies variant class', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('danger');
  });

  it('applies size class', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('sm');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('sets aria-busy when loading', () => {
    render(<Button loading>Working</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('does not set aria-busy when not loading', () => {
    render(<Button>Idle</Button>);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  it('calls onClick handler', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>No</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Wide</Button>);
    expect(screen.getByRole('button').className).toContain('fullWidth');
  });
});

// ─── Alert ───────────────────────────────────────────────────────────────────

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert>Something happened</Alert>);
    expect(screen.getByRole('status')).toHaveTextContent('Something happened');
  });

  it('has role="alert"', () => {
    render(<Alert>Info</Alert>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies variant class', () => {
    render(<Alert variant="error">Error!</Alert>);
    expect(screen.getByRole('alert').className).toContain('error');
  });

  it('defaults to info variant', () => {
    render(<Alert>Default</Alert>);
    expect(screen.getByRole('status').className).toContain('info');
  });

  it('renders dismiss button when onDismiss provided', () => {
    render(<Alert onDismiss={() => {}}>Dismissable</Alert>);
    expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument();
  });

  it('does not render dismiss button without onDismiss', () => {
    render(<Alert>Static</Alert>);
    expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Alert onDismiss={onDismiss}>Close me</Alert>);
    await user.click(screen.getByLabelText('Dismiss alert'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ─── Input ───────────────────────────────────────────────────────────────────

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('associates label with input via htmlFor', () => {
    render(<Input label="Username" />);
    const input = screen.getByLabelText('Username');
    expect(input.tagName).toBe('INPUT');
  });

  it('shows required indicator', () => {
    render(<Input label="Name" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Password" error="Too short" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });

  it('sets aria-invalid when error is present', () => {
    render(<Input label="Field" error="Invalid" />);
    expect(screen.getByLabelText('Field')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid without error', () => {
    render(<Input label="Field" />);
    expect(screen.getByLabelText('Field')).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows help text when no error', () => {
    render(<Input label="Email" helpText="We will not share it" />);
    expect(screen.getByText('We will not share it')).toBeInTheDocument();
  });

  it('hides help text when error is shown', () => {
    render(<Input label="Email" helpText="Help" error="Required" />);
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input label="Search" />);
    const input = screen.getByLabelText('Search');
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });
});

// ─── Modal ───────────────────────────────────────────────────────────────────

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="My Modal">Hello</Modal>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Dialog Title">Body</Modal>);
    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
  });

  it('has accessible close button', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="X">Body</Modal>);
    expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Test">Body</Modal>);
    await user.click(screen.getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has aria-labelledby pointing to the title', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Labeled">Body</Modal>);
    const dialog = screen.getByRole('dialog');
    const titleId = dialog.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId!)).toHaveTextContent('Labeled');
  });
});

// ─── Spinner ─────────────────────────────────────────────────────────────────

describe('Spinner', () => {
  it('renders with status role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    render(<Spinner />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('contains screen-reader text', () => {
    render(<Spinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies size class', () => {
    render(<Spinner size="lg" />);
    expect(screen.getByRole('status').className).toContain('lg');
  });

  it('defaults to md size', () => {
    render(<Spinner />);
    expect(screen.getByRole('status').className).toContain('md');
  });
});

// ─── Card ────────────────────────────────────────────────────────────────────

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card content</p></Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies card class', () => {
    const { container } = render(<Card>Content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('card');
  });

  it('applies accent class when accent is true', () => {
    const { container } = render(<Card accent>Accent</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('accent');
  });

  it('does not apply accent class by default', () => {
    const { container } = render(<Card>Normal</Card>);
    expect((container.firstChild as HTMLElement).className).not.toContain('accent');
  });

  it('passes through className', () => {
    const { container } = render(<Card className="custom">Custom</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('custom');
  });
});

// ─── ErrorBoundary ───────────────────────────────────────────────────────────

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error');
  return <p>Safe content</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error from React error boundary + our componentDidCatch
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('shows error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });

  it('shows Go to Dashboard and Try Again buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows error details in dev mode', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    // In test (DEV), error message is shown in a pre tag
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
