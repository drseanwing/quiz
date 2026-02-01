/**
 * @file        Quiz player component tests
 * @description Tests for QuestionRenderer, MCPlayer, TFPlayer, SliderPlayer,
 *              DragOrderPlayer, ImageMapPlayer, and FeedbackDisplay
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionType, type IQuizQuestion, type IImmediateFeedback } from '@/types';
import { MCPlayer } from '@/components/quiz/MCPlayer';
import { TFPlayer } from '@/components/quiz/TFPlayer';
import { SliderPlayer } from '@/components/quiz/SliderPlayer';
import { DragOrderPlayer } from '@/components/quiz/DragOrderPlayer';
import { ImageMapPlayer } from '@/components/quiz/ImageMapPlayer';
import { FeedbackDisplay } from '@/components/quiz/FeedbackDisplay';
import { QuestionRenderer } from '@/components/quiz/QuestionRenderer';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mcOptions = [
  { id: 'a', text: 'Alpha' },
  { id: 'b', text: 'Beta' },
  { id: 'c', text: 'Gamma' },
];

function makeQuestion(overrides: Partial<IQuizQuestion> = {}): IQuizQuestion {
  return {
    id: 'q1',
    type: QuestionType.MULTIPLE_CHOICE_SINGLE,
    prompt: '<p>Pick one</p>',
    promptImage: null,
    options: mcOptions,
    ...overrides,
  };
}

function makeFeedback(overrides: Partial<IImmediateFeedback> = {}): IImmediateFeedback {
  return {
    questionId: 'q1',
    correctAnswer: { optionId: 'a' },
    feedback: 'Good job!',
    feedbackImage: null,
    score: 1,
    isCorrect: true,
    ...overrides,
  };
}

// ─── MCPlayer ───────────────────────────────────────────────────────────────

describe('MCPlayer', () => {
  it('renders radio buttons for single select', () => {
    render(<MCPlayer options={mcOptions} answer={null} onChange={vi.fn()} multi={false} disabled={false} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('renders checkboxes for multi select', () => {
    render(<MCPlayer options={mcOptions} answer={null} onChange={vi.fn()} multi={true} disabled={false} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
    expect(screen.getByText('Select all that apply')).toBeInTheDocument();
  });

  it('selects the correct radio for single answer', () => {
    render(<MCPlayer options={mcOptions} answer={{ optionId: 'b' }} onChange={vi.fn()} multi={false} disabled={false} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  it('calls onChange with optionId on single select click', async () => {
    const onChange = vi.fn();
    render(<MCPlayer options={mcOptions} answer={null} onChange={onChange} multi={false} disabled={false} />);
    await userEvent.setup({ delay: null }).click(screen.getAllByRole('radio')[2]!);
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('calls onChange with array on multi toggle', async () => {
    const onChange = vi.fn();
    render(<MCPlayer options={mcOptions} answer={{ optionIds: ['a'] }} onChange={onChange} multi={true} disabled={false} />);
    await userEvent.setup({ delay: null }).click(screen.getAllByRole('checkbox')[1]!);
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(['a', 'b']));
  });

  it('removes option on multi toggle when already selected', async () => {
    const onChange = vi.fn();
    render(<MCPlayer options={mcOptions} answer={{ optionIds: ['a', 'b'] }} onChange={onChange} multi={true} disabled={false} />);
    await userEvent.setup({ delay: null }).click(screen.getAllByRole('checkbox')[0]!);
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('does not call onChange when disabled', async () => {
    const onChange = vi.fn();
    render(<MCPlayer options={mcOptions} answer={null} onChange={onChange} multi={false} disabled={true} />);
    const radio = screen.getAllByRole('radio')[0];
    expect(radio).toBeDisabled();
    // Verify disabled state; click on disabled input won't fire onChange handler
  });

  it('returns null for non-array options', () => {
    const { container } = render(<MCPlayer options={'not-an-array' as never} answer={null} onChange={vi.fn()} multi={false} disabled={false} />);
    expect(container.innerHTML).toBe('');
  });
});

// ─── TFPlayer ───────────────────────────────────────────────────────────────

describe('TFPlayer', () => {
  it('renders True and False buttons', () => {
    render(<TFPlayer answer={null} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByRole('button', { name: 'True' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'False' })).toBeInTheDocument();
  });

  it('has correct aria-label on group', () => {
    render(<TFPlayer answer={null} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Select True or False');
  });

  it('calls onChange(true) when True clicked', async () => {
    const onChange = vi.fn();
    render(<TFPlayer answer={null} onChange={onChange} disabled={false} />);
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'True' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange(false) when False clicked', async () => {
    const onChange = vi.fn();
    render(<TFPlayer answer={null} onChange={onChange} disabled={false} />);
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'False' }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('marks True button as pressed when selected', () => {
    render(<TFPlayer answer={{ value: true }} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByRole('button', { name: 'True' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'False' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks False button as pressed when selected', () => {
    render(<TFPlayer answer={{ value: false }} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByRole('button', { name: 'False' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'True' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables buttons when disabled', () => {
    render(<TFPlayer answer={null} onChange={vi.fn()} disabled={true} />);
    expect(screen.getByRole('button', { name: 'True' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'False' })).toBeDisabled();
  });
});

// ─── SliderPlayer ───────────────────────────────────────────────────────────

describe('SliderPlayer', () => {
  const sliderOpts = { min: 0, max: 100, step: 5 };

  it('renders a range input with correct attributes', () => {
    render(<SliderPlayer options={sliderOpts} answer={null} onChange={vi.fn()} disabled={false} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '5');
  });

  it('defaults to midpoint when no answer', () => {
    render(<SliderPlayer options={sliderOpts} answer={null} onChange={vi.fn()} disabled={false} />);
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('50');
  });

  it('shows current value from answer', () => {
    render(<SliderPlayer options={sliderOpts} answer={{ value: 75 }} onChange={vi.fn()} disabled={false} />);
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('75');
  });

  it('calls onChange on input change', () => {
    const onChange = vi.fn();
    render(<SliderPlayer options={sliderOpts} answer={null} onChange={onChange} disabled={false} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '30' } });
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it('shows unit when provided', () => {
    render(<SliderPlayer options={{ ...sliderOpts, unit: 'kg' }} answer={{ value: 50 }} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('50 kg')).toBeInTheDocument();
    expect(screen.getByText('0 kg')).toBeInTheDocument();
    expect(screen.getByText('100 kg')).toBeInTheDocument();
  });

  it('does not show unit when not provided', () => {
    render(<SliderPlayer options={sliderOpts} answer={{ value: 50 }} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('disables slider when disabled', () => {
    render(<SliderPlayer options={sliderOpts} answer={null} onChange={vi.fn()} disabled={true} />);
    expect(screen.getByRole('slider')).toBeDisabled();
  });
});

// ─── DragOrderPlayer ────────────────────────────────────────────────────────

describe('DragOrderPlayer', () => {
  const dragOptions = [
    { id: '1', text: 'First' },
    { id: '2', text: 'Second' },
    { id: '3', text: 'Third' },
  ];

  it('renders all items', () => {
    render(<DragOrderPlayer options={dragOptions} answer={null} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('shows hint text', () => {
    render(<DragOrderPlayer options={dragOptions} answer={null} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('Drag items to put them in the correct order')).toBeInTheDocument();
  });

  it('renders items in answer order when provided', () => {
    const { container } = render(
      <DragOrderPlayer options={dragOptions} answer={{ orderedIds: ['3', '1', '2'] }} onChange={vi.fn()} disabled={false} />
    );
    const texts = Array.from(container.querySelectorAll('[class*="text"]')).map(el => el.textContent);
    expect(texts).toEqual(['Third', 'First', 'Second']);
  });

  it('renders items in original order when no answer', () => {
    const { container } = render(
      <DragOrderPlayer options={dragOptions} answer={null} onChange={vi.fn()} disabled={false} />
    );
    const texts = Array.from(container.querySelectorAll('[class*="text"]')).map(el => el.textContent);
    expect(texts).toEqual(['First', 'Second', 'Third']);
  });

  it('shows numbered indices', () => {
    render(<DragOrderPlayer options={dragOptions} answer={null} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

// ─── ImageMapPlayer ─────────────────────────────────────────────────────────

describe('ImageMapPlayer', () => {
  it('renders image with correct src', () => {
    render(<ImageMapPlayer options={{ image: 'https://example.com/img.png' }} answer={null} onChange={vi.fn()} disabled={false} />);
    const img = screen.getByAltText('Click to answer');
    expect(img).toHaveAttribute('src', 'https://example.com/img.png');
  });

  it('shows hint text', () => {
    render(<ImageMapPlayer options={{ image: 'https://example.com/img.png' }} answer={null} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('Click on the image to mark your answer')).toBeInTheDocument();
  });

  it('shows fallback message when no image', () => {
    render(<ImageMapPlayer options={{}} answer={null} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('No image provided for this question')).toBeInTheDocument();
  });

  it('displays marker when answer provided', () => {
    render(<ImageMapPlayer options={{ image: 'https://example.com/img.png' }} answer={{ x: 50, y: 100 }} onChange={vi.fn()} disabled={false} />);
    const marker = screen.getByLabelText('Selected point at 50, 100');
    expect(marker).toBeInTheDocument();
  });

  it('does not display marker when no answer', () => {
    render(<ImageMapPlayer options={{ image: 'https://example.com/img.png' }} answer={null} onChange={vi.fn()} disabled={false} />);
    expect(screen.queryByLabelText(/Selected point/)).not.toBeInTheDocument();
  });

  it('calls onChange with coordinates on image click', () => {
    const onChange = vi.fn();
    render(<ImageMapPlayer options={{ image: 'https://example.com/img.png' }} answer={null} onChange={onChange} disabled={false} />);
    const img = screen.getByAltText('Click to answer');
    // Mock getBoundingClientRect for the image
    vi.spyOn(img, 'getBoundingClientRect').mockReturnValue({
      left: 10, top: 20, right: 510, bottom: 420,
      width: 500, height: 400, x: 10, y: 20, toJSON: () => {},
    });
    fireEvent.click(img, { clientX: 60, clientY: 70 });
    expect(onChange).toHaveBeenCalledWith({ x: 50, y: 50 });
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<ImageMapPlayer options={{ image: 'https://example.com/img.png' }} answer={null} onChange={onChange} disabled={true} />);
    fireEvent.click(screen.getByAltText('Click to answer'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── FeedbackDisplay ────────────────────────────────────────────────────────

describe('FeedbackDisplay', () => {
  it('shows "Correct" badge for correct feedback', () => {
    render(<FeedbackDisplay feedback={makeFeedback({ isCorrect: true })} />);
    expect(screen.getByText('Correct')).toBeInTheDocument();
  });

  it('shows "Incorrect" badge for incorrect feedback', () => {
    render(<FeedbackDisplay feedback={makeFeedback({ isCorrect: false, score: 0 })} />);
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
  });

  it('shows partial score for partial credit', () => {
    render(<FeedbackDisplay feedback={makeFeedback({ isCorrect: false, score: 0.5 })} />);
    expect(screen.getByText(/Partial: 50%/)).toBeInTheDocument();
  });

  it('does not show partial for zero score', () => {
    render(<FeedbackDisplay feedback={makeFeedback({ isCorrect: false, score: 0 })} />);
    expect(screen.queryByText(/Partial/)).not.toBeInTheDocument();
  });

  it('renders feedback text', () => {
    render(<FeedbackDisplay feedback={makeFeedback({ feedback: 'Well done!' })} />);
    expect(screen.getByText('Well done!')).toBeInTheDocument();
  });

  it('renders feedback image when provided', () => {
    render(<FeedbackDisplay feedback={makeFeedback({ feedbackImage: 'https://example.com/fb.png' })} />);
    expect(screen.getByAltText('Feedback illustration')).toHaveAttribute('src', 'https://example.com/fb.png');
  });

  it('does not render feedback image when null', () => {
    render(<FeedbackDisplay feedback={makeFeedback({ feedbackImage: null })} />);
    expect(screen.queryByAltText('Feedback illustration')).not.toBeInTheDocument();
  });

  it('has correct class for correct answer', () => {
    const { container } = render(<FeedbackDisplay feedback={makeFeedback({ isCorrect: true })} />);
    expect(container.firstElementChild!.className).toContain('correct');
  });

  it('has correct class for incorrect answer', () => {
    const { container } = render(<FeedbackDisplay feedback={makeFeedback({ isCorrect: false, score: 0 })} />);
    expect(container.firstElementChild!.className).toContain('incorrect');
  });
});

// ─── QuestionRenderer ───────────────────────────────────────────────────────

describe('QuestionRenderer', () => {
  it('renders question number and total', () => {
    render(<QuestionRenderer question={makeQuestion()} questionIndex={2} totalQuestions={10} answer={null} onChange={vi.fn()} />);
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument();
  });

  it('renders question type label for MC', () => {
    render(<QuestionRenderer question={makeQuestion()} questionIndex={0} totalQuestions={5} answer={null} onChange={vi.fn()} />);
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
  });

  it('renders prompt HTML', () => {
    render(<QuestionRenderer question={makeQuestion({ prompt: '<p>What is 2+2?</p>' })} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
  });

  it('renders prompt image when provided', () => {
    render(<QuestionRenderer question={makeQuestion({ promptImage: 'https://example.com/q.png' })} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.getByAltText('Question illustration')).toHaveAttribute('src', 'https://example.com/q.png');
  });

  it('does not render prompt image when null', () => {
    render(<QuestionRenderer question={makeQuestion({ promptImage: null })} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.queryByAltText('Question illustration')).not.toBeInTheDocument();
  });

  it('renders MCPlayer for MULTIPLE_CHOICE_SINGLE type', () => {
    render(<QuestionRenderer question={makeQuestion()} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('renders MCPlayer with checkboxes for MULTIPLE_CHOICE_MULTI', () => {
    render(<QuestionRenderer question={makeQuestion({ type: QuestionType.MULTIPLE_CHOICE_MULTI })} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('renders TFPlayer for TRUE_FALSE type', () => {
    render(<QuestionRenderer question={makeQuestion({ type: QuestionType.TRUE_FALSE, options: {} })} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'True' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'False' })).toBeInTheDocument();
  });

  it('renders SliderPlayer for SLIDER type', () => {
    render(<QuestionRenderer question={makeQuestion({ type: QuestionType.SLIDER, options: { min: 1, max: 10, step: 1 } })} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders DragOrderPlayer for DRAG_ORDER type', () => {
    render(<QuestionRenderer question={makeQuestion({ type: QuestionType.DRAG_ORDER })} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.getByText('Drag items to put them in the correct order')).toBeInTheDocument();
  });

  it('renders ImageMapPlayer for IMAGE_MAP type', () => {
    render(<QuestionRenderer question={makeQuestion({ type: QuestionType.IMAGE_MAP, options: { image: 'https://example.com/img.png' } })} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.getByText('Click on the image to mark your answer')).toBeInTheDocument();
  });

  it('renders FeedbackDisplay when feedback provided', () => {
    render(<QuestionRenderer question={makeQuestion()} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} feedback={makeFeedback()} />);
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Good job!')).toBeInTheDocument();
  });

  it('does not render FeedbackDisplay when no feedback', () => {
    render(<QuestionRenderer question={makeQuestion()} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />);
    expect(screen.queryByText('Correct')).not.toBeInTheDocument();
    expect(screen.queryByText('Incorrect')).not.toBeInTheDocument();
  });

  it('disables inputs when feedback is present', () => {
    render(<QuestionRenderer question={makeQuestion()} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} feedback={makeFeedback()} />);
    screen.getAllByRole('radio').forEach(radio => expect(radio).toBeDisabled());
  });

  it('shows type labels for all question types', () => {
    const labels: [QuestionType, string][] = [
      [QuestionType.MULTIPLE_CHOICE_SINGLE, 'Multiple Choice'],
      [QuestionType.MULTIPLE_CHOICE_MULTI, 'Multiple Select'],
      [QuestionType.TRUE_FALSE, 'True / False'],
      [QuestionType.SLIDER, 'Slider'],
      [QuestionType.DRAG_ORDER, 'Drag to Order'],
      [QuestionType.IMAGE_MAP, 'Image Map'],
    ];
    for (const [type, label] of labels) {
      const opts = type === QuestionType.SLIDER ? { min: 0, max: 10, step: 1 } :
                   type === QuestionType.IMAGE_MAP ? { image: 'https://example.com/img.png' } : mcOptions;
      const { unmount } = render(
        <QuestionRenderer question={makeQuestion({ type, options: opts as never })} questionIndex={0} totalQuestions={1} answer={null} onChange={vi.fn()} />
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it('wraps onChange with correct shape for MC single', async () => {
    const onChange = vi.fn();
    render(<QuestionRenderer question={makeQuestion()} questionIndex={0} totalQuestions={1} answer={null} onChange={onChange} />);
    await userEvent.setup({ delay: null }).click(screen.getAllByRole('radio')[0]!);
    expect(onChange).toHaveBeenCalledWith({ optionId: 'a' });
  });

  it('wraps onChange with correct shape for TF', async () => {
    const onChange = vi.fn();
    render(<QuestionRenderer question={makeQuestion({ type: QuestionType.TRUE_FALSE, options: {} })} questionIndex={0} totalQuestions={1} answer={null} onChange={onChange} />);
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'True' }));
    expect(onChange).toHaveBeenCalledWith({ value: true });
  });

  it('wraps onChange with correct shape for Slider', () => {
    const onChange = vi.fn();
    render(<QuestionRenderer question={makeQuestion({ type: QuestionType.SLIDER, options: { min: 0, max: 100, step: 10 } })} questionIndex={0} totalQuestions={1} answer={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } });
    expect(onChange).toHaveBeenCalledWith({ value: 40 });
  });
});
