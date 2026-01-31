/**
 * @file        Import/Export Service Tests
 * @description Tests for import validation logic and URL validation
 */

// We test the validation logic by invoking importQuestionBank with invalid data.
// Since importQuestionBank calls validateImportData (private), testing through
// the public API ensures validation works correctly.
// For these tests, we mock Prisma to prevent DB calls.

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    questionBank: { findUnique: jest.fn() },
    question: { createMany: jest.fn() },
  },
}));

import { importQuestionBank } from '@/services/importExportService';

function validImportData(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    bank: {
      title: 'Test Bank',
      description: 'A test',
      timeLimit: 30,
      randomQuestions: true,
      randomAnswers: true,
      passingScore: 70,
      feedbackTiming: 'END',
      questionCount: 5,
      maxAttempts: 0,
    },
    questions: [
      {
        type: 'MULTIPLE_CHOICE_SINGLE',
        prompt: '<p>What is 2+2?</p>',
        promptImage: null,
        options: [
          { id: '1', text: '3' },
          { id: '2', text: '4' },
        ],
        correctAnswer: { selectedId: '2' },
        feedback: '<p>The answer is 4</p>',
        feedbackImage: null,
        referenceLink: 'https://example.com',
        order: 0,
      },
    ],
    ...overrides,
  };
}

describe('importQuestionBank - validation', () => {
  it('rejects non-object input', async () => {
    await expect(importQuestionBank('not an object', 'user-1')).rejects.toThrow(
      'Invalid import data: expected an object'
    );
  });

  it('rejects null input', async () => {
    await expect(importQuestionBank(null, 'user-1')).rejects.toThrow(
      'Invalid import data: expected an object'
    );
  });

  it('rejects unsupported version', async () => {
    await expect(
      importQuestionBank(validImportData({ version: '2.0' }), 'user-1')
    ).rejects.toThrow('Unsupported import format version');
  });

  it('rejects missing bank configuration', async () => {
    await expect(
      importQuestionBank({ version: '1.0', questions: [] }, 'user-1')
    ).rejects.toThrow('Invalid import data: missing bank configuration');
  });

  it('rejects empty bank title', async () => {
    const data = validImportData();
    (data.bank as Record<string, unknown>).title = '';
    await expect(importQuestionBank(data, 'user-1')).rejects.toThrow(
      'Invalid import data: bank title is required'
    );
  });

  it('rejects non-array questions', async () => {
    const data = validImportData({ questions: 'not an array' });
    await expect(importQuestionBank(data, 'user-1')).rejects.toThrow(
      'Invalid import data: questions must be an array'
    );
  });

  it('rejects questions exceeding max limit (500)', async () => {
    const questions = Array.from({ length: 501 }, (_, i) => ({
      type: 'MULTIPLE_CHOICE_SINGLE',
      prompt: `Q${i}`,
      options: [{ id: '1', text: 'A' }],
      correctAnswer: { selectedId: '1' },
      feedback: 'FB',
      order: i,
    }));
    const data = validImportData({ questions });
    await expect(importQuestionBank(data, 'user-1')).rejects.toThrow(
      'Import exceeds maximum of 500 questions'
    );
  });

  it('rejects questions with invalid type', async () => {
    const data = validImportData({
      questions: [
        {
          type: 'INVALID_TYPE',
          prompt: 'Q1',
          options: [{ id: '1', text: 'A' }],
          correctAnswer: { selectedId: '1' },
          feedback: 'FB',
          order: 0,
        },
      ],
    });
    await expect(importQuestionBank(data, 'user-1')).rejects.toThrow(
      'Import validation failed'
    );
  });

  it('rejects questions with missing prompt', async () => {
    const data = validImportData({
      questions: [
        {
          type: 'TRUE_FALSE',
          prompt: '',
          options: [{ id: '1', text: 'True' }, { id: '2', text: 'False' }],
          correctAnswer: { selectedId: '1' },
          feedback: 'FB',
          order: 0,
        },
      ],
    });
    await expect(importQuestionBank(data, 'user-1')).rejects.toThrow(
      'Import validation failed'
    );
  });

  it('rejects questions with missing options', async () => {
    const data = validImportData({
      questions: [
        {
          type: 'MULTIPLE_CHOICE_SINGLE',
          prompt: 'Q1',
          options: null,
          correctAnswer: { selectedId: '1' },
          feedback: 'FB',
          order: 0,
        },
      ],
    });
    await expect(importQuestionBank(data, 'user-1')).rejects.toThrow(
      'Import validation failed'
    );
  });

  it('rejects questions with missing correctAnswer', async () => {
    const data = validImportData({
      questions: [
        {
          type: 'MULTIPLE_CHOICE_SINGLE',
          prompt: 'Q1',
          options: [{ id: '1', text: 'A' }],
          correctAnswer: null,
          feedback: 'FB',
          order: 0,
        },
      ],
    });
    await expect(importQuestionBank(data, 'user-1')).rejects.toThrow(
      'Import validation failed'
    );
  });

  it('accepts valid import data (reaches DB call)', async () => {
    const prisma = require('@/config/database').default;
    const mockBank = { id: 'bank-1', title: 'Test Bank' };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        questionBank: {
          create: jest.fn().mockResolvedValue(mockBank),
        },
        question: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return fn(tx);
    });

    const result = await importQuestionBank(validImportData(), 'user-1');
    expect(result).toEqual({
      id: 'bank-1',
      title: 'Test Bank',
      questionCount: 1,
    });
  });
});
