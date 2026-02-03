/**
 * Plain JavaScript seed script for production containers
 * Usage: node prisma/seed.js
 */

const { PrismaClient, UserRole, QuestionBankStatus, FeedbackTiming, QuestionType, AttemptStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function uuid() {
  return require('crypto').randomUUID();
}

async function main() {
  console.log('Seeding UAT data...\n');

  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} users. Skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash('Password1!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@health.qld.gov.au',
      passwordHash,
      firstName: 'Sarah',
      surname: 'Mitchell',
      role: UserRole.ADMIN,
      isActive: true,
      lastLoginAt: new Date('2026-01-31T08:30:00Z'),
    },
  });
  console.log('  Admin:', admin.email);

  const editor1 = await prisma.user.create({
    data: {
      email: 'j.chen@health.qld.gov.au',
      passwordHash,
      firstName: 'James',
      surname: 'Chen',
      idNumber: 'MN-2045',
      role: UserRole.EDITOR,
      isActive: true,
      lastLoginAt: new Date('2026-01-30T14:20:00Z'),
    },
  });

  const editor2 = await prisma.user.create({
    data: {
      email: 'r.kumar@health.qld.gov.au',
      passwordHash,
      firstName: 'Rina',
      surname: 'Kumar',
      idNumber: 'MN-3182',
      role: UserRole.EDITOR,
      isActive: true,
      lastLoginAt: new Date('2026-01-28T09:15:00Z'),
    },
  });
  console.log('  Editors:', editor1.email + ',', editor2.email);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'b.thompson@health.qld.gov.au',
        passwordHash,
        firstName: 'Ben',
        surname: 'Thompson',
        idNumber: 'MN-4201',
        role: UserRole.USER,
        isActive: true,
        lastLoginAt: new Date('2026-01-31T10:00:00Z'),
      },
    }),
    prisma.user.create({
      data: {
        email: 'l.nguyen@health.qld.gov.au',
        passwordHash,
        firstName: 'Lisa',
        surname: 'Nguyen',
        idNumber: 'MN-4455',
        role: UserRole.USER,
        isActive: true,
        lastLoginAt: new Date('2026-01-30T16:45:00Z'),
      },
    }),
    prisma.user.create({
      data: {
        email: 'm.oconnor@health.qld.gov.au',
        passwordHash,
        firstName: 'Michael',
        surname: "O'Connor",
        idNumber: 'MN-5010',
        role: UserRole.USER,
        isActive: true,
        lastLoginAt: new Date('2026-01-29T11:30:00Z'),
      },
    }),
    prisma.user.create({
      data: {
        email: 'a.patel@health.qld.gov.au',
        passwordHash,
        firstName: 'Anita',
        surname: 'Patel',
        idNumber: 'MN-5234',
        role: UserRole.USER,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'd.wilson@health.qld.gov.au',
        passwordHash,
        firstName: 'David',
        surname: 'Wilson',
        role: UserRole.USER,
        isActive: false,
      },
    }),
  ]);
  console.log('  Users:', users.length, 'created');

  // Question Bank 1 - BLS Assessment (PUBLIC)
  const blsBank = await prisma.questionBank.create({
    data: {
      title: 'Basic Life Support (BLS) Assessment',
      description: 'Assess competency in BLS procedures including CPR technique, AED use, and airway management. Required for all clinical staff annually.',
      status: QuestionBankStatus.PUBLIC,
      timeLimit: 1200,
      randomQuestions: true,
      randomAnswers: true,
      passingScore: 80,
      feedbackTiming: FeedbackTiming.END,
      questionCount: 8,
      maxAttempts: 3,
      notificationEmail: 'resus.education@health.qld.gov.au',
      createdById: editor1.id,
    },
  });

  const blsQuestions = await Promise.all([
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What is the recommended compression-to-ventilation ratio for <strong>single-rescuer adult CPR</strong>?</p>', options: [{ id: 'a1', text: '15:2' }, { id: 'a2', text: '30:2' }, { id: 'a3', text: '15:1' }, { id: 'a4', text: '30:1' }], correctAnswer: { optionId: 'a2' }, feedback: '<p>The ARC recommends a <strong>30:2</strong> compression-to-ventilation ratio for single-rescuer adult CPR.</p>', referenceLink: 'https://resus.org.au/guidelines/', order: 1 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What is the recommended depth of chest compressions for an adult patient?</p>', options: [{ id: 'b1', text: 'At least 3 cm' }, { id: 'b2', text: 'At least 4 cm' }, { id: 'b3', text: 'At least 5 cm' }, { id: 'b4', text: 'At least 6 cm' }], correctAnswer: { optionId: 'b3' }, feedback: '<p>Compressions should be <strong>at least 5 cm deep</strong> for adult patients.</p>', order: 2 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>An AED should only be used by trained medical personnel.</p>', options: [{ id: 'c1', text: 'True' }, { id: 'c2', text: 'False' }], correctAnswer: { value: false }, feedback: '<p><strong>False.</strong> AEDs are designed for use by any bystander.</p>', order: 3 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>When performing CPR, you should allow full chest recoil between compressions.</p>', options: [{ id: 'd1', text: 'True' }, { id: 'd2', text: 'False' }], correctAnswer: { value: true }, feedback: '<p><strong>True.</strong> Full chest recoil allows the heart to refill between compressions.</p>', order: 4 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.DRAG_ORDER, prompt: '<p>Place the following steps of the <strong>BLS algorithm</strong> in the correct order:</p>', options: [{ id: 'e1', text: 'Check for danger' }, { id: 'e2', text: 'Check for response' }, { id: 'e3', text: 'Send for help (call 000)' }, { id: 'e4', text: 'Check airway' }, { id: 'e5', text: 'Check for breathing' }, { id: 'e6', text: 'Start CPR (30 compressions)' }, { id: 'e7', text: 'Attach AED as soon as available' }], correctAnswer: { orderedIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] }, feedback: '<p>The BLS algorithm follows <strong>DRSABCD</strong>.</p>', referenceLink: 'https://resus.org.au/guidelines/', order: 5 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.MULTIPLE_CHOICE_MULTI, prompt: '<p>Which of the following are signs of <strong>effective CPR</strong>? (Select all that apply)</p>', options: [{ id: 'f1', text: 'Visible chest rise with ventilations' }, { id: 'f2', text: 'Return of skin colour' }, { id: 'f3', text: 'Pupil dilation' }, { id: 'f4', text: 'Palpable pulse with compressions' }, { id: 'f5', text: 'End-tidal CO\u2082 reading above 10 mmHg' }], correctAnswer: { optionIds: ['f1', 'f2', 'f4', 'f5'] }, feedback: '<p>Signs of effective CPR include visible chest rise, improving skin colour, palpable pulses, and ETCO\u2082 > 10 mmHg.</p>', order: 6 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.SLIDER, prompt: '<p>What is the recommended <strong>compression rate</strong> for adult CPR (compressions per minute)?</p>', options: { min: 60, max: 160, step: 5, unit: 'per min' }, correctAnswer: { value: 110, tolerance: 10 }, feedback: '<p>The recommended compression rate is <strong>100\u2013120 compressions per minute</strong>.</p>', order: 7 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>After delivering a shock with an AED, what should you do <strong>immediately</strong>?</p>', options: [{ id: 'h1', text: 'Check for a pulse' }, { id: 'h2', text: 'Resume CPR starting with compressions' }, { id: 'h3', text: 'Give two rescue breaths' }, { id: 'h4', text: 'Wait for the AED to reanalyse' }], correctAnswer: { optionId: 'h2' }, feedback: '<p>After shock delivery, <strong>immediately resume CPR</strong> starting with chest compressions.</p>', order: 8 } }),
  ]);
  console.log('\n  Bank: "' + blsBank.title + '" (' + blsQuestions.length + ' questions, PUBLIC)');

  // Question Bank 2 - ACLS (OPEN)
  const aclsBank = await prisma.questionBank.create({
    data: {
      title: 'Advanced Cardiac Life Support (ACLS)',
      description: 'Assessment of ACLS competencies including rhythm recognition, pharmacology, and advanced airway management.',
      status: QuestionBankStatus.OPEN,
      timeLimit: 1800,
      randomQuestions: true,
      randomAnswers: false,
      passingScore: 75,
      feedbackTiming: FeedbackTiming.IMMEDIATE,
      questionCount: 10,
      maxAttempts: 0,
      notificationEmail: 'resus.education@health.qld.gov.au',
      createdById: editor1.id,
    },
  });

  const aclsQuestions = await Promise.all([
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>A patient presents with pulseless VT. What is the <strong>first-line treatment</strong>?</p>', options: [{ id: 'ac1', text: 'Adrenaline 1 mg IV' }, { id: 'ac2', text: 'Amiodarone 300 mg IV' }, { id: 'ac3', text: 'Defibrillation at 200J biphasic' }, { id: 'ac4', text: 'Synchronised cardioversion at 100J' }], correctAnswer: { optionId: 'ac3' }, feedback: '<p>Pulseless VT is a <strong>shockable rhythm</strong>. The first intervention is defibrillation.</p>', order: 1 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What dose of <strong>adrenaline</strong> is administered during cardiac arrest in adults?</p>', options: [{ id: 'ad1', text: '0.1 mg IV every 3-5 min' }, { id: 'ad2', text: '1 mg IV every 3-5 min' }, { id: 'ad3', text: '1 mg IV every 5-10 min' }, { id: 'ad4', text: '0.5 mg IM every 5 min' }], correctAnswer: { optionId: 'ad2' }, feedback: '<p>Standard dose is <strong>1 mg IV</strong> every 3-5 minutes.</p>', order: 2 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>Atropine is recommended as a first-line treatment for asystole.</p>', options: [{ id: 'ag1', text: 'True' }, { id: 'ag2', text: 'False' }], correctAnswer: { value: false }, feedback: '<p><strong>False.</strong> Atropine is no longer recommended for cardiac arrest.</p>', order: 3 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What is the <strong>maximum single dose</strong> of amiodarone during cardiac arrest?</p>', options: [{ id: 'ah1', text: '150 mg' }, { id: 'ah2', text: '300 mg' }, { id: 'ah3', text: '450 mg' }, { id: 'ah4', text: '600 mg' }], correctAnswer: { optionId: 'ah2' }, feedback: '<p>Initial dose is <strong>300 mg IV</strong> bolus after the 3rd shock.</p>', order: 4 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.SLIDER, prompt: '<p>Recommended energy (joules) for first biphasic defibrillation in an adult?</p>', options: { min: 50, max: 400, step: 10, unit: 'J' }, correctAnswer: { value: 200, tolerance: 20 }, feedback: '<p>Recommended energy is <strong>200 J</strong>.</p>', order: 5 } }),
  ]);
  console.log('  Bank: "' + aclsBank.title + '" (' + aclsQuestions.length + ' questions, OPEN)');

  // Question Bank 3 - Medication Safety (PUBLIC)
  const medsBank = await prisma.questionBank.create({
    data: {
      title: 'Medication Safety in Emergencies',
      description: 'Test knowledge of emergency medication dosing, administration routes, and safety checks.',
      status: QuestionBankStatus.PUBLIC,
      timeLimit: 900,
      randomQuestions: true,
      randomAnswers: true,
      passingScore: 80,
      feedbackTiming: FeedbackTiming.END,
      questionCount: 6,
      maxAttempts: 5,
      createdById: editor2.id,
    },
  });

  const medsQuestions = await Promise.all([
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>Adrenaline infusion calculation question</p>', options: [{ id: 'me1', text: '16.4 mL/hr' }, { id: 'me2', text: '26.3 mL/hr' }, { id: 'me3', text: '32.8 mL/hr' }, { id: 'me4', text: '42.0 mL/hr' }], correctAnswer: { optionId: 'me2' }, feedback: '<p>26.3 mL/hr is correct.</p>', order: 1 } }),
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>Amiodarone can be safely administered through a peripheral IV during cardiac arrest.</p>', options: [{ id: 'mf1', text: 'True' }, { id: 'mf2', text: 'False' }], correctAnswer: { value: true }, feedback: '<p><strong>True.</strong></p>', order: 2 } }),
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.MULTIPLE_CHOICE_MULTI, prompt: '<p>Which are <strong>high-alert medications</strong>? (Select all)</p>', options: [{ id: 'mg1', text: 'Potassium chloride' }, { id: 'mg2', text: 'Insulin' }, { id: 'mg3', text: 'Paracetamol' }, { id: 'mg4', text: 'Heparin' }, { id: 'mg5', text: 'Metaraminol' }], correctAnswer: { optionIds: ['mg1', 'mg2', 'mg4', 'mg5'] }, feedback: '<p>Potassium chloride, insulin, heparin, and metaraminol are high-alert medications.</p>', order: 3 } }),
  ]);
  console.log('  Bank: "' + medsBank.title + '" (' + medsQuestions.length + ' questions, PUBLIC)');

  console.log('\n--- UAT Seed Complete ---');
  console.log('\nLogin credentials (all accounts): Password1!');
  console.log('\nAccounts:');
  console.log('  ADMIN:  admin@health.qld.gov.au');
  console.log('  EDITOR: j.chen@health.qld.gov.au');
  console.log('  EDITOR: r.kumar@health.qld.gov.au');
  console.log('  USER:   b.thompson@health.qld.gov.au');
  console.log('  USER:   l.nguyen@health.qld.gov.au');
  console.log("  USER:   m.oconnor@health.qld.gov.au");
  console.log('  USER:   a.patel@health.qld.gov.au');
  console.log('  USER:   d.wilson@health.qld.gov.au (deactivated)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
