/**
 * Plain JavaScript seed script for production containers
 * This is the authoritative seed script — it mirrors seed.ts exactly.
 *
 * Usage: node prisma/seed.js
 * Or via package.json: npm run db:seed:prod
 */

const { PrismaClient, UserRole, QuestionBankStatus, FeedbackTiming, QuestionType, AttemptStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function pickQuestions(questions, count) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q) => q.id);
}

async function main() {
  console.log('Seeding UAT data...\n');

  // Idempotency check — skip if data already exists
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} users. Skipping seed.`);
    return;
  }

  // =========================================================================
  // USERS
  // =========================================================================
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

  // =========================================================================
  // QUESTION BANK 1 — BLS Assessment (PUBLIC, created by editor1)
  // =========================================================================
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
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What is the recommended compression-to-ventilation ratio for <strong>single-rescuer adult CPR</strong>?</p>', options: [{ id: 'a1', text: '15:2' }, { id: 'a2', text: '30:2' }, { id: 'a3', text: '15:1' }, { id: 'a4', text: '30:1' }], correctAnswer: { optionId: 'a2' }, feedback: '<p>The ARC recommends a <strong>30:2</strong> compression-to-ventilation ratio for single-rescuer adult CPR. This applies to both healthcare providers and lay rescuers.</p>', referenceLink: 'https://resus.org.au/guidelines/', order: 1 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What is the recommended depth of chest compressions for an adult patient?</p>', options: [{ id: 'b1', text: 'At least 3 cm' }, { id: 'b2', text: 'At least 4 cm' }, { id: 'b3', text: 'At least 5 cm' }, { id: 'b4', text: 'At least 6 cm' }], correctAnswer: { optionId: 'b3' }, feedback: '<p>Compressions should be <strong>at least 5 cm deep</strong> (but no more than 6 cm) for adult patients to ensure adequate cardiac output during CPR.</p>', order: 2 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>An AED should only be used by trained medical personnel.</p>', options: [{ id: 'c1', text: 'True' }, { id: 'c2', text: 'False' }], correctAnswer: { value: false }, feedback: '<p><strong>False.</strong> AEDs are designed for use by any bystander. Modern AEDs provide voice prompts and are safe for untrained users. Early defibrillation significantly improves survival rates.</p>', order: 3 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>When performing CPR, you should allow full chest recoil between compressions.</p>', options: [{ id: 'd1', text: 'True' }, { id: 'd2', text: 'False' }], correctAnswer: { value: true }, feedback: '<p><strong>True.</strong> Full chest recoil allows the heart to refill between compressions. Leaning on the chest reduces venous return and compromises CPR effectiveness.</p>', order: 4 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.DRAG_ORDER, prompt: '<p>Place the following steps of the <strong>BLS algorithm</strong> in the correct order:</p>', options: [{ id: 'e1', text: 'Check for danger' }, { id: 'e2', text: 'Check for response' }, { id: 'e3', text: 'Send for help (call 000)' }, { id: 'e4', text: 'Check airway' }, { id: 'e5', text: 'Check for breathing' }, { id: 'e6', text: 'Start CPR (30 compressions)' }, { id: 'e7', text: 'Attach AED as soon as available' }], correctAnswer: { orderedIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] }, feedback: '<p>The BLS algorithm follows <strong>DRSABCD</strong>: Danger, Response, Send for help, Airway, Breathing, CPR, Defibrillation. This sequence ensures scene safety before patient care.</p>', referenceLink: 'https://resus.org.au/guidelines/', order: 5 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.MULTIPLE_CHOICE_MULTI, prompt: '<p>Which of the following are signs of <strong>effective CPR</strong>? (Select all that apply)</p>', options: [{ id: 'f1', text: 'Visible chest rise with ventilations' }, { id: 'f2', text: 'Return of skin colour' }, { id: 'f3', text: 'Pupil dilation' }, { id: 'f4', text: 'Palpable pulse with compressions' }, { id: 'f5', text: 'End-tidal CO\u2082 reading above 10 mmHg' }], correctAnswer: { optionIds: ['f1', 'f2', 'f4', 'f5'] }, feedback: '<p>Signs of effective CPR include visible chest rise, improving skin colour, palpable pulses during compressions, and ETCO\u2082 > 10 mmHg. Pupil <em>constriction</em> (not dilation) may indicate improving cerebral perfusion.</p>', order: 6 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.SLIDER, prompt: '<p>What is the recommended <strong>compression rate</strong> for adult CPR (compressions per minute)?</p>', options: { min: 60, max: 160, step: 5, unit: 'per min' }, correctAnswer: { value: 110, tolerance: 10 }, feedback: '<p>The recommended compression rate is <strong>100\u2013120 compressions per minute</strong>. Rates below 100 provide insufficient circulation; rates above 120 tend to reduce compression depth.</p>', order: 7 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>After delivering a shock with an AED, what should you do <strong>immediately</strong>?</p>', options: [{ id: 'h1', text: 'Check for a pulse' }, { id: 'h2', text: 'Resume CPR starting with compressions' }, { id: 'h3', text: 'Give two rescue breaths' }, { id: 'h4', text: 'Wait for the AED to reanalyse' }], correctAnswer: { optionId: 'h2' }, feedback: '<p>After shock delivery, <strong>immediately resume CPR</strong> starting with chest compressions. Do not pause to check rhythm or pulse \u2014 continue for 2 minutes before the AED reanalyses.</p>', order: 8 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>Which position should be used for an <strong>unconscious, breathing patient</strong> with no suspected spinal injury?</p>', options: [{ id: 'i1', text: 'Supine position' }, { id: 'i2', text: 'Recovery (lateral) position' }, { id: 'i3', text: 'Prone position' }, { id: 'i4', text: 'Fowler position' }], correctAnswer: { optionId: 'i2' }, feedback: '<p>The <strong>recovery (lateral) position</strong> maintains a patent airway and allows drainage of fluids. It should be used for unconscious patients who are breathing normally with no suspected spinal injury.</p>', order: 9 } }),
    prisma.question.create({ data: { bankId: blsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>Compression-only CPR (hands-only) is an acceptable alternative for bystanders who are unwilling or unable to provide rescue breaths.</p>', options: [{ id: 'j1', text: 'True' }, { id: 'j2', text: 'False' }], correctAnswer: { value: true }, feedback: '<p><strong>True.</strong> Compression-only CPR is better than no CPR at all. For untrained bystanders or those unwilling to give breaths, continuous chest compressions can maintain some circulation until help arrives.</p>', order: 10 } }),
  ]);
  console.log('\n  Bank: "' + blsBank.title + '" (' + blsQuestions.length + ' questions, PUBLIC)');

  // =========================================================================
  // QUESTION BANK 2 — ACLS (OPEN, created by editor1)
  // =========================================================================
  const aclsBank = await prisma.questionBank.create({
    data: {
      title: 'Advanced Cardiac Life Support (ACLS)',
      description: 'Assessment of ACLS competencies including rhythm recognition, pharmacology, and advanced airway management. For medical officers and senior nursing staff.',
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
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>A patient presents with pulseless ventricular tachycardia (VT). What is the <strong>first-line treatment</strong>?</p>', options: [{ id: 'ac1', text: 'Adrenaline 1 mg IV' }, { id: 'ac2', text: 'Amiodarone 300 mg IV' }, { id: 'ac3', text: 'Defibrillation at 200J biphasic' }, { id: 'ac4', text: 'Synchronised cardioversion at 100J' }], correctAnswer: { optionId: 'ac3' }, feedback: '<p>Pulseless VT is a <strong>shockable rhythm</strong>. The first intervention is defibrillation. Medications are considered after 2 cycles of CPR without ROSC.</p>', order: 1 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What dose of <strong>adrenaline</strong> is administered during cardiac arrest in adults?</p>', options: [{ id: 'ad1', text: '0.1 mg (1:10,000) IV every 3\u20135 min' }, { id: 'ad2', text: '1 mg (1:10,000) IV every 3\u20135 min' }, { id: 'ad3', text: '1 mg (1:1,000) IV every 5\u201310 min' }, { id: 'ad4', text: '0.5 mg (1:1,000) IM every 5 min' }], correctAnswer: { optionId: 'ad2' }, feedback: '<p>The standard dose is <strong>1 mg (1:10,000) IV</strong> every 3\u20135 minutes during cardiac arrest.</p>', order: 2 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.DRAG_ORDER, prompt: '<p>Arrange the steps for managing a <strong>shockable cardiac arrest</strong> (VF/pVT) in the correct order:</p>', options: [{ id: 'ae1', text: 'Confirm cardiac arrest and start CPR' }, { id: 'ae2', text: 'Deliver first shock (200J biphasic)' }, { id: 'ae3', text: 'Resume CPR for 2 minutes' }, { id: 'ae4', text: 'Rhythm check \u2014 if still VF/pVT, deliver second shock' }, { id: 'ae5', text: 'Resume CPR, give adrenaline 1 mg IV' }, { id: 'ae6', text: 'Rhythm check \u2014 if still VF/pVT, deliver third shock' }, { id: 'ae7', text: 'Resume CPR, give amiodarone 300 mg IV' }], correctAnswer: { orderedIds: ['ae1', 'ae2', 'ae3', 'ae4', 'ae5', 'ae6', 'ae7'] }, feedback: '<p>Follow the ARC shockable rhythm algorithm: CPR \u2192 Shock \u2192 CPR 2 min \u2192 Shock \u2192 CPR + Adrenaline \u2192 Shock \u2192 CPR + Amiodarone.</p>', order: 3 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.MULTIPLE_CHOICE_MULTI, prompt: '<p>Which of the following are <strong>reversible causes (4 H\u2019s and 4 T\u2019s)</strong> of cardiac arrest? (Select all that apply)</p>', options: [{ id: 'af1', text: 'Hypoxia' }, { id: 'af2', text: 'Hypovolaemia' }, { id: 'af3', text: 'Hyperglycaemia' }, { id: 'af4', text: 'Tension pneumothorax' }, { id: 'af5', text: 'Tamponade (cardiac)' }, { id: 'af6', text: 'Tachycardia' }], correctAnswer: { optionIds: ['af1', 'af2', 'af4', 'af5'] }, feedback: '<p>The 4 H\u2019s: Hypoxia, Hypovolaemia, Hypo/Hyperkalaemia, Hypothermia. The 4 T\u2019s: Tension pneumothorax, Tamponade, Toxins, Thrombosis.</p>', order: 4 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>Atropine is recommended as a first-line treatment for asystole in the current ARC guidelines.</p>', options: [{ id: 'ag1', text: 'True' }, { id: 'ag2', text: 'False' }], correctAnswer: { value: false }, feedback: '<p><strong>False.</strong> Atropine is no longer recommended for cardiac arrest (asystole or PEA). Focus on high-quality CPR, adrenaline, and identifying reversible causes.</p>', order: 5 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What is the <strong>maximum single dose</strong> of amiodarone during cardiac arrest?</p>', options: [{ id: 'ah1', text: '150 mg' }, { id: 'ah2', text: '300 mg' }, { id: 'ah3', text: '450 mg' }, { id: 'ah4', text: '600 mg' }], correctAnswer: { optionId: 'ah2' }, feedback: '<p>The initial dose of amiodarone in cardiac arrest is <strong>300 mg IV</strong> bolus after the 3rd shock. A further 150 mg may be given after the 5th shock.</p>', order: 6 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.SLIDER, prompt: '<p>What is the recommended energy level (in joules) for the <strong>first biphasic defibrillation</strong> attempt in an adult?</p>', options: { min: 50, max: 400, step: 10, unit: 'J' }, correctAnswer: { value: 200, tolerance: 20 }, feedback: '<p>The recommended energy for the first biphasic defibrillation is <strong>200 J</strong>. Subsequent shocks should be at the same or higher energy level.</p>', order: 7 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>A patient develops <strong>torsades de pointes</strong>. Which medication is the treatment of choice?</p>', options: [{ id: 'aj1', text: 'Amiodarone 300 mg IV' }, { id: 'aj2', text: 'Lignocaine 100 mg IV' }, { id: 'aj3', text: 'Magnesium sulphate 2 g IV' }, { id: 'aj4', text: 'Adenosine 6 mg IV' }], correctAnswer: { optionId: 'aj3' }, feedback: '<p><strong>Magnesium sulphate 2 g IV</strong> over 1\u20132 minutes is the treatment of choice for torsades de pointes.</p>', order: 8 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.MULTIPLE_CHOICE_MULTI, prompt: '<p>Which of the following are <strong>non-shockable rhythms</strong>? (Select all that apply)</p>', options: [{ id: 'ak1', text: 'Asystole' }, { id: 'ak2', text: 'Ventricular fibrillation' }, { id: 'ak3', text: 'Pulseless electrical activity (PEA)' }, { id: 'ak4', text: 'Pulseless ventricular tachycardia' }], correctAnswer: { optionIds: ['ak1', 'ak3'] }, feedback: '<p>Non-shockable rhythms are <strong>asystole</strong> and <strong>PEA</strong>. VF and pulseless VT are shockable rhythms requiring defibrillation.</p>', order: 9 } }),
    prisma.question.create({ data: { bankId: aclsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>During cardiac arrest, adrenaline should be administered via the endotracheal tube if IV/IO access is unavailable.</p>', options: [{ id: 'al1', text: 'True' }, { id: 'al2', text: 'False' }], correctAnswer: { value: false }, feedback: '<p><strong>False.</strong> The endotracheal route is no longer recommended. If IV access cannot be established, <strong>intraosseous (IO) access</strong> is the preferred alternative.</p>', order: 10 } }),
  ]);
  console.log('  Bank: "' + aclsBank.title + '" (' + aclsQuestions.length + ' questions, OPEN)');

  // =========================================================================
  // QUESTION BANK 3 — Neonatal Resuscitation (DRAFT, created by editor2)
  // =========================================================================
  const neoBank = await prisma.questionBank.create({
    data: {
      title: 'Neonatal Resuscitation Program (NRP)',
      description: 'Assessment of neonatal resuscitation skills for midwifery and neonatal nursing staff. Covers the NRP algorithm, equipment preparation, and initial stabilisation.',
      status: QuestionBankStatus.DRAFT,
      timeLimit: 0,
      randomQuestions: false,
      randomAnswers: true,
      passingScore: 85,
      feedbackTiming: FeedbackTiming.NONE,
      questionCount: 8,
      maxAttempts: 2,
      createdById: editor2.id,
    },
  });

  const neoQuestions = await Promise.all([
    prisma.question.create({ data: { bankId: neoBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>At birth, a newborn is not breathing and is limp. After drying and stimulation, there is no improvement. What is the <strong>next step</strong>?</p>', options: [{ id: 'n1', text: 'Begin chest compressions' }, { id: 'n2', text: 'Administer adrenaline' }, { id: 'n3', text: 'Provide positive pressure ventilation (PPV)' }, { id: 'n4', text: 'Intubate immediately' }], correctAnswer: { optionId: 'n3' }, feedback: '<p><strong>Positive pressure ventilation</strong> is the single most important step in neonatal resuscitation.</p>', order: 1 } }),
    prisma.question.create({ data: { bankId: neoBank.id, type: QuestionType.SLIDER, prompt: '<p>What rate (breaths per minute) should positive pressure ventilation be delivered to a newborn?</p>', options: { min: 10, max: 80, step: 5, unit: 'breaths/min' }, correctAnswer: { value: 40, tolerance: 10 }, feedback: '<p>PPV should be delivered at <strong>40\u201360 breaths per minute</strong> for a newborn.</p>', order: 2 } }),
    prisma.question.create({ data: { bankId: neoBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>For a term newborn, initial resuscitation should begin with 100% oxygen.</p>', options: [{ id: 'nc1', text: 'True' }, { id: 'nc2', text: 'False' }], correctAnswer: { value: false }, feedback: '<p><strong>False.</strong> For term newborns, resuscitation should begin with <strong>21% oxygen (room air)</strong>.</p>', order: 3 } }),
    prisma.question.create({ data: { bankId: neoBank.id, type: QuestionType.DRAG_ORDER, prompt: '<p>Place the initial steps of <strong>neonatal resuscitation</strong> in the correct order:</p>', options: [{ id: 'nd1', text: 'Provide warmth (radiant warmer)' }, { id: 'nd2', text: 'Position the airway (sniffing position)' }, { id: 'nd3', text: 'Dry the baby thoroughly' }, { id: 'nd4', text: 'Stimulate (flick soles of feet)' }, { id: 'nd5', text: 'Assess breathing and heart rate' }], correctAnswer: { orderedIds: ['nd1', 'nd2', 'nd3', 'nd4', 'nd5'] }, feedback: '<p>The initial steps follow: Warmth \u2192 Airway positioning \u2192 Drying \u2192 Stimulation \u2192 Assessment.</p>', order: 4 } }),
    prisma.question.create({ data: { bankId: neoBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>Chest compressions in a newborn should be initiated when the heart rate remains below what threshold despite adequate ventilation?</p>', options: [{ id: 'ne1', text: 'Below 40 bpm' }, { id: 'ne2', text: 'Below 60 bpm' }, { id: 'ne3', text: 'Below 80 bpm' }, { id: 'ne4', text: 'Below 100 bpm' }], correctAnswer: { optionId: 'ne2' }, feedback: '<p>Chest compressions should begin when the heart rate is <strong>below 60 bpm</strong> despite 30 seconds of effective ventilation.</p>', order: 5 } }),
    prisma.question.create({ data: { bankId: neoBank.id, type: QuestionType.MULTIPLE_CHOICE_MULTI, prompt: '<p>Which of the following equipment should be prepared <strong>before every delivery</strong>? (Select all that apply)</p>', options: [{ id: 'nf1', text: 'Radiant warmer and warm towels' }, { id: 'nf2', text: 'Self-inflating bag and appropriately sized mask' }, { id: 'nf3', text: 'Suction device (bulb syringe or mechanical)' }, { id: 'nf4', text: 'Defibrillator with neonatal pads' }, { id: 'nf5', text: 'Pulse oximeter with neonatal probe' }], correctAnswer: { optionIds: ['nf1', 'nf2', 'nf3', 'nf5'] }, feedback: '<p>A radiant warmer, bag-mask device, suction, and pulse oximeter should be prepared for every delivery. Defibrillators are <strong>not used</strong> in neonatal resuscitation.</p>', order: 6 } }),
    prisma.question.create({ data: { bankId: neoBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What is the compression-to-ventilation ratio for neonatal CPR?</p>', options: [{ id: 'ng1', text: '3:1' }, { id: 'ng2', text: '5:1' }, { id: 'ng3', text: '15:2' }, { id: 'ng4', text: '30:2' }], correctAnswer: { optionId: 'ng1' }, feedback: '<p>Neonatal CPR uses a <strong>3:1 ratio</strong> (3 compressions followed by 1 ventilation).</p>', order: 7 } }),
    prisma.question.create({ data: { bankId: neoBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>Meconium-stained amniotic fluid is an automatic indication for endotracheal suctioning of the newborn.</p>', options: [{ id: 'nh1', text: 'True' }, { id: 'nh2', text: 'False' }], correctAnswer: { value: false }, feedback: '<p><strong>False.</strong> Routine intubation and tracheal suctioning for meconium is no longer recommended.</p>', order: 8 } }),
  ]);
  console.log('  Bank: "' + neoBank.title + '" (' + neoQuestions.length + ' questions, DRAFT)');

  // =========================================================================
  // QUESTION BANK 4 — Medication Safety (PUBLIC, created by editor2)
  // =========================================================================
  const medsBank = await prisma.questionBank.create({
    data: {
      title: 'Medication Safety in Emergencies',
      description: 'Test knowledge of emergency medication dosing, administration routes, and safety checks. Covers high-risk medications used during resuscitation and acute care.',
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
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>A patient weighing 70 kg requires an adrenaline infusion at 0.1 mcg/kg/min. The infusion is prepared as 4 mg in 250 mL. What rate (mL/hr) should the infusion pump be set to?</p>', options: [{ id: 'me1', text: '16.4 mL/hr' }, { id: 'me2', text: '26.3 mL/hr' }, { id: 'me3', text: '32.8 mL/hr' }, { id: 'me4', text: '42.0 mL/hr' }], correctAnswer: { optionId: 'me2' }, feedback: '<p>Dose = 0.1 mcg/kg/min \u00d7 70 kg = 7 mcg/min. Concentration = 4000 mcg / 250 mL = 16 mcg/mL. Rate = 7 / 16 = 0.4375 mL/min \u00d7 60 = <strong>26.3 mL/hr</strong>.</p>', order: 1 } }),
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>Amiodarone can be safely administered through a peripheral IV line during cardiac arrest.</p>', options: [{ id: 'mf1', text: 'True' }, { id: 'mf2', text: 'False' }], correctAnswer: { value: true }, feedback: '<p><strong>True.</strong> During cardiac arrest, amiodarone can be given as a rapid IV bolus through a peripheral line.</p>', order: 2 } }),
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.MULTIPLE_CHOICE_MULTI, prompt: '<p>Which of the following are considered <strong>high-alert medications</strong> in emergency settings? (Select all that apply)</p>', options: [{ id: 'mg1', text: 'Potassium chloride concentrate' }, { id: 'mg2', text: 'Insulin' }, { id: 'mg3', text: 'Paracetamol' }, { id: 'mg4', text: 'Heparin' }, { id: 'mg5', text: 'Metaraminol' }], correctAnswer: { optionIds: ['mg1', 'mg2', 'mg4', 'mg5'] }, feedback: '<p>Potassium chloride, insulin, heparin, and metaraminol are all <strong>high-alert medications</strong>.</p>', order: 3 } }),
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.DRAG_ORDER, prompt: '<p>Arrange the <strong>5 Rights of Medication Administration</strong> in a logical checking order:</p>', options: [{ id: 'mh1', text: 'Right patient' }, { id: 'mh2', text: 'Right drug' }, { id: 'mh3', text: 'Right dose' }, { id: 'mh4', text: 'Right route' }, { id: 'mh5', text: 'Right time' }], correctAnswer: { orderedIds: ['mh1', 'mh2', 'mh3', 'mh4', 'mh5'] }, feedback: '<p>While all 5 Rights must be verified, a logical sequence is: <strong>Patient \u2192 Drug \u2192 Dose \u2192 Route \u2192 Time</strong>.</p>', order: 4 } }),
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.SLIDER, prompt: '<p>What is the standard adult dose of <strong>naloxone</strong> (in micrograms) for opioid reversal via the IV route?</p>', options: { min: 50, max: 800, step: 10, unit: 'mcg' }, correctAnswer: { value: 400, tolerance: 50 }, feedback: '<p>The standard adult IV dose of naloxone is <strong>400 mcg (0.4 mg)</strong>.</p>', order: 5 } }),
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>Which electrolyte imbalance is most commonly associated with <strong>digoxin toxicity</strong>?</p>', options: [{ id: 'mj1', text: 'Hyperkalaemia' }, { id: 'mj2', text: 'Hypokalaemia' }, { id: 'mj3', text: 'Hypernatraemia' }, { id: 'mj4', text: 'Hypocalcaemia' }], correctAnswer: { optionId: 'mj2' }, feedback: '<p><strong>Hypokalaemia</strong> increases the risk of digoxin toxicity.</p>', order: 6 } }),
    prisma.question.create({ data: { bankId: medsBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What is the correct dilution for preparing an <strong>adrenaline infusion</strong> for haemodynamic support in adults?</p>', options: [{ id: 'mk1', text: '1 mg in 100 mL normal saline' }, { id: 'mk2', text: '4 mg in 250 mL 5% dextrose' }, { id: 'mk3', text: '10 mg in 500 mL normal saline' }, { id: 'mk4', text: '1 mg in 1000 mL normal saline' }], correctAnswer: { optionId: 'mk2' }, feedback: '<p>The standard preparation is <strong>4 mg in 250 mL</strong> (concentration 16 mcg/mL).</p>', order: 7 } }),
  ]);
  console.log('  Bank: "' + medsBank.title + '" (' + medsQuestions.length + ' questions, PUBLIC)');

  // =========================================================================
  // QUESTION BANK 5 — Equipment Competency (ARCHIVED, created by editor1)
  // =========================================================================
  const equipBank = await prisma.questionBank.create({
    data: {
      title: 'Emergency Equipment Competency (2025)',
      description: 'Annual competency assessment for emergency resuscitation equipment. This bank has been archived and replaced by the 2026 version.',
      status: QuestionBankStatus.ARCHIVED,
      timeLimit: 600,
      randomQuestions: true,
      randomAnswers: true,
      passingScore: 70,
      feedbackTiming: FeedbackTiming.END,
      questionCount: 5,
      maxAttempts: 3,
      createdById: editor1.id,
      createdAt: new Date('2025-03-15T02:00:00Z'),
    },
  });

  const equipQuestions = await Promise.all([
    prisma.question.create({ data: { bankId: equipBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What size laryngoscope blade is typically used for an <strong>average adult</strong> during intubation?</p>', options: [{ id: 'eq1', text: 'Macintosh size 2' }, { id: 'eq2', text: 'Macintosh size 3' }, { id: 'eq3', text: 'Macintosh size 4' }, { id: 'eq4', text: 'Miller size 2' }], correctAnswer: { optionId: 'eq2' }, feedback: '<p>A <strong>Macintosh size 3</strong> blade is the standard choice for most adults.</p>', order: 1 } }),
    prisma.question.create({ data: { bankId: equipBank.id, type: QuestionType.TRUE_FALSE, prompt: '<p>A supraglottic airway device (e.g., i-gel or LMA) can be used as an alternative to endotracheal intubation during cardiac arrest.</p>', options: [{ id: 'er1', text: 'True' }, { id: 'er2', text: 'False' }], correctAnswer: { value: true }, feedback: '<p><strong>True.</strong> Supraglottic airways are an acceptable alternative.</p>', order: 2 } }),
    prisma.question.create({ data: { bankId: equipBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>How often should the emergency resuscitation trolley be checked?</p>', options: [{ id: 'es1', text: 'Weekly' }, { id: 'es2', text: 'Daily and after each use' }, { id: 'es3', text: 'Monthly' }, { id: 'es4', text: 'Only after each use' }], correctAnswer: { optionId: 'es2' }, feedback: '<p>Resuscitation trolleys must be checked <strong>daily and after every use</strong>.</p>', order: 3 } }),
    prisma.question.create({ data: { bankId: equipBank.id, type: QuestionType.MULTIPLE_CHOICE_MULTI, prompt: '<p>Which items must be checked on the defibrillator during the daily trolley check? (Select all that apply)</p>', options: [{ id: 'et1', text: 'Battery charge level' }, { id: 'et2', text: 'Electrode pad expiry dates' }, { id: 'et3', text: 'ECG lead connections' }, { id: 'et4', text: 'Internal calibration test' }], correctAnswer: { optionIds: ['et1', 'et2', 'et3'] }, feedback: '<p>Daily checks include battery charge, pad expiry, and lead integrity.</p>', order: 4 } }),
    prisma.question.create({ data: { bankId: equipBank.id, type: QuestionType.MULTIPLE_CHOICE_SINGLE, prompt: '<p>What is the recommended internal diameter of an endotracheal tube for an average adult female?</p>', options: [{ id: 'eu1', text: '6.0 mm' }, { id: 'eu2', text: '7.0 mm' }, { id: 'eu3', text: '8.0 mm' }, { id: 'eu4', text: '9.0 mm' }], correctAnswer: { optionId: 'eu2' }, feedback: '<p>The recommended ETT size for an adult female is <strong>7.0\u20137.5 mm</strong> ID.</p>', order: 5 } }),
  ]);
  console.log('  Bank: "' + equipBank.title + '" (' + equipQuestions.length + ' questions, ARCHIVED)');

  // =========================================================================
  // QUIZ ATTEMPTS
  // =========================================================================
  console.log('\n  Creating quiz attempts...');

  // Ben: completed BLS, passed
  const blsOrder1 = pickQuestions(blsQuestions, 8);
  await prisma.quizAttempt.create({ data: { userId: users[0].id, bankId: blsBank.id, status: AttemptStatus.COMPLETED, score: 7, maxScore: 8, percentage: 87.5, passed: true, startedAt: new Date('2026-01-28T09:00:00Z'), completedAt: new Date('2026-01-28T09:14:32Z'), timeSpent: 872, questionOrder: blsOrder1, responses: { [blsQuestions[0].id]: { optionId: 'a2' }, [blsQuestions[1].id]: { optionId: 'b3' }, [blsQuestions[2].id]: { value: false }, [blsQuestions[3].id]: { value: true }, [blsQuestions[4].id]: { orderedIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] }, [blsQuestions[5].id]: { optionIds: ['f1', 'f2', 'f4', 'f5'] }, [blsQuestions[6].id]: { value: 115 }, [blsQuestions[7].id]: { optionId: 'h1' } } } });

  // Ben: completed ACLS, failed
  const aclsOrder1 = pickQuestions(aclsQuestions, 10);
  await prisma.quizAttempt.create({ data: { userId: users[0].id, bankId: aclsBank.id, status: AttemptStatus.COMPLETED, score: 6, maxScore: 10, percentage: 60.0, passed: false, startedAt: new Date('2026-01-29T13:00:00Z'), completedAt: new Date('2026-01-29T13:22:15Z'), timeSpent: 1335, questionOrder: aclsOrder1, responses: { [aclsQuestions[0].id]: { optionId: 'ac3' }, [aclsQuestions[1].id]: { optionId: 'ad2' }, [aclsQuestions[2].id]: { orderedIds: ['ae1', 'ae2', 'ae3', 'ae5', 'ae4', 'ae6', 'ae7'] }, [aclsQuestions[3].id]: { optionIds: ['af1', 'af2', 'af3', 'af4'] }, [aclsQuestions[4].id]: { value: true }, [aclsQuestions[5].id]: { optionId: 'ah2' }, [aclsQuestions[6].id]: { value: 200 }, [aclsQuestions[7].id]: { optionId: 'aj3' }, [aclsQuestions[8].id]: { optionIds: ['ak1', 'ak3'] }, [aclsQuestions[9].id]: { value: true } } } });

  // Lisa: completed BLS, passed (100%)
  const blsOrder2 = pickQuestions(blsQuestions, 8);
  await prisma.quizAttempt.create({ data: { userId: users[1].id, bankId: blsBank.id, status: AttemptStatus.COMPLETED, score: 8, maxScore: 8, percentage: 100.0, passed: true, startedAt: new Date('2026-01-27T14:30:00Z'), completedAt: new Date('2026-01-27T14:41:05Z'), timeSpent: 665, questionOrder: blsOrder2, responses: { [blsQuestions[0].id]: { optionId: 'a2' }, [blsQuestions[1].id]: { optionId: 'b3' }, [blsQuestions[2].id]: { value: false }, [blsQuestions[3].id]: { value: true }, [blsQuestions[4].id]: { orderedIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] }, [blsQuestions[5].id]: { optionIds: ['f1', 'f2', 'f4', 'f5'] }, [blsQuestions[6].id]: { value: 110 }, [blsQuestions[7].id]: { optionId: 'h2' } } } });

  // Lisa: completed ACLS, passed
  const aclsOrder2 = pickQuestions(aclsQuestions, 10);
  await prisma.quizAttempt.create({ data: { userId: users[1].id, bankId: aclsBank.id, status: AttemptStatus.COMPLETED, score: 9, maxScore: 10, percentage: 90.0, passed: true, startedAt: new Date('2026-01-28T10:00:00Z'), completedAt: new Date('2026-01-28T10:18:30Z'), timeSpent: 1110, questionOrder: aclsOrder2, responses: { [aclsQuestions[0].id]: { optionId: 'ac3' }, [aclsQuestions[1].id]: { optionId: 'ad2' }, [aclsQuestions[2].id]: { orderedIds: ['ae1', 'ae2', 'ae3', 'ae4', 'ae5', 'ae6', 'ae7'] }, [aclsQuestions[3].id]: { optionIds: ['af1', 'af2', 'af4', 'af5'] }, [aclsQuestions[4].id]: { value: false }, [aclsQuestions[5].id]: { optionId: 'ah2' }, [aclsQuestions[6].id]: { value: 200 }, [aclsQuestions[7].id]: { optionId: 'aj1' }, [aclsQuestions[8].id]: { optionIds: ['ak1', 'ak3'] }, [aclsQuestions[9].id]: { value: false } } } });

  // Lisa: completed Meds, passed
  const medsOrder1 = pickQuestions(medsQuestions, 6);
  await prisma.quizAttempt.create({ data: { userId: users[1].id, bankId: medsBank.id, status: AttemptStatus.COMPLETED, score: 5, maxScore: 6, percentage: 83.3, passed: true, startedAt: new Date('2026-01-30T15:00:00Z'), completedAt: new Date('2026-01-30T15:11:20Z'), timeSpent: 680, questionOrder: medsOrder1, responses: { [medsQuestions[0].id]: { optionId: 'me2' }, [medsQuestions[1].id]: { value: true }, [medsQuestions[2].id]: { optionIds: ['mg1', 'mg2', 'mg4', 'mg5'] }, [medsQuestions[3].id]: { orderedIds: ['mh1', 'mh2', 'mh3', 'mh4', 'mh5'] }, [medsQuestions[4].id]: { value: 400 }, [medsQuestions[5].id]: { optionId: 'mj1' } } } });

  // Michael: completed BLS, failed
  const blsOrder3 = pickQuestions(blsQuestions, 8);
  await prisma.quizAttempt.create({ data: { userId: users[2].id, bankId: blsBank.id, status: AttemptStatus.COMPLETED, score: 5, maxScore: 8, percentage: 62.5, passed: false, startedAt: new Date('2026-01-29T11:00:00Z'), completedAt: new Date('2026-01-29T11:18:45Z'), timeSpent: 1125, questionOrder: blsOrder3, responses: { [blsQuestions[0].id]: { optionId: 'a1' }, [blsQuestions[1].id]: { optionId: 'b3' }, [blsQuestions[2].id]: { value: true }, [blsQuestions[3].id]: { value: true }, [blsQuestions[4].id]: { orderedIds: ['e1', 'e3', 'e2', 'e4', 'e5', 'e6', 'e7'] }, [blsQuestions[5].id]: { optionIds: ['f1', 'f4'] }, [blsQuestions[6].id]: { value: 110 }, [blsQuestions[7].id]: { optionId: 'h2' } } } });

  // Michael: retook BLS, passed
  const blsOrder4 = pickQuestions(blsQuestions, 8);
  await prisma.quizAttempt.create({ data: { userId: users[2].id, bankId: blsBank.id, status: AttemptStatus.COMPLETED, score: 7, maxScore: 8, percentage: 87.5, passed: true, startedAt: new Date('2026-01-30T09:00:00Z'), completedAt: new Date('2026-01-30T09:12:10Z'), timeSpent: 730, questionOrder: blsOrder4, responses: { [blsQuestions[0].id]: { optionId: 'a2' }, [blsQuestions[1].id]: { optionId: 'b3' }, [blsQuestions[2].id]: { value: false }, [blsQuestions[3].id]: { value: true }, [blsQuestions[4].id]: { orderedIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] }, [blsQuestions[5].id]: { optionIds: ['f1', 'f2', 'f4', 'f5'] }, [blsQuestions[6].id]: { value: 105 }, [blsQuestions[7].id]: { optionId: 'h3' } } } });

  // Michael: in-progress ACLS
  const aclsOrder3 = pickQuestions(aclsQuestions, 10);
  await prisma.quizAttempt.create({ data: { userId: users[2].id, bankId: aclsBank.id, status: AttemptStatus.IN_PROGRESS, score: 0, maxScore: 10, percentage: 0, passed: false, startedAt: new Date('2026-01-31T14:00:00Z'), timeSpent: 420, questionOrder: aclsOrder3, responses: { [aclsQuestions[0].id]: { optionId: 'ac3' }, [aclsQuestions[1].id]: { optionId: 'ad2' }, [aclsQuestions[2].id]: { orderedIds: ['ae1', 'ae2', 'ae3', 'ae4', 'ae5', 'ae6', 'ae7'] } } } });

  // Anita: completed Meds, passed (100%)
  const medsOrder2 = pickQuestions(medsQuestions, 6);
  await prisma.quizAttempt.create({ data: { userId: users[3].id, bankId: medsBank.id, status: AttemptStatus.COMPLETED, score: 6, maxScore: 6, percentage: 100.0, passed: true, startedAt: new Date('2026-01-30T08:30:00Z'), completedAt: new Date('2026-01-30T08:39:15Z'), timeSpent: 555, questionOrder: medsOrder2, responses: { [medsQuestions[0].id]: { optionId: 'me2' }, [medsQuestions[1].id]: { value: true }, [medsQuestions[2].id]: { optionIds: ['mg1', 'mg2', 'mg4', 'mg5'] }, [medsQuestions[3].id]: { orderedIds: ['mh1', 'mh2', 'mh3', 'mh4', 'mh5'] }, [medsQuestions[4].id]: { value: 400 }, [medsQuestions[5].id]: { optionId: 'mj2' } } } });

  // Anita: timed-out BLS
  const blsOrder5 = pickQuestions(blsQuestions, 8);
  await prisma.quizAttempt.create({ data: { userId: users[3].id, bankId: blsBank.id, status: AttemptStatus.TIMED_OUT, score: 3, maxScore: 8, percentage: 37.5, passed: false, startedAt: new Date('2026-01-31T16:00:00Z'), completedAt: new Date('2026-01-31T16:20:00Z'), timeSpent: 1200, questionOrder: blsOrder5, responses: { [blsQuestions[0].id]: { optionId: 'a2' }, [blsQuestions[1].id]: { optionId: 'b3' }, [blsQuestions[2].id]: { value: false } } } });

  // Ben: historical attempt on archived Equipment bank
  const equipOrder1 = pickQuestions(equipQuestions, 5);
  await prisma.quizAttempt.create({ data: { userId: users[0].id, bankId: equipBank.id, status: AttemptStatus.COMPLETED, score: 4, maxScore: 5, percentage: 80.0, passed: true, startedAt: new Date('2025-06-15T10:00:00Z'), completedAt: new Date('2025-06-15T10:08:30Z'), timeSpent: 510, questionOrder: equipOrder1, responses: { [equipQuestions[0].id]: { optionId: 'eq2' }, [equipQuestions[1].id]: { value: true }, [equipQuestions[2].id]: { optionId: 'es2' }, [equipQuestions[3].id]: { optionIds: ['et1', 'et2', 'et3'] }, [equipQuestions[4].id]: { optionId: 'eu3' } } } });

  console.log('  11 quiz attempts created');

  // =========================================================================
  // AUDIT LOGS
  // =========================================================================
  const auditEntries = [
    { userId: admin.id, action: 'USER_LOGIN', entityType: 'User', entityId: admin.id, details: { method: 'password' }, ipAddress: '10.100.1.50', createdAt: new Date('2026-01-31T08:30:00Z') },
    { userId: editor1.id, action: 'QUESTION_BANK_CREATE', entityType: 'QuestionBank', entityId: blsBank.id, details: { title: blsBank.title }, ipAddress: '10.100.2.15', createdAt: new Date('2026-01-20T09:00:00Z') },
    { userId: editor1.id, action: 'QUESTION_BANK_STATUS_CHANGE', entityType: 'QuestionBank', entityId: blsBank.id, details: { from: 'DRAFT', to: 'PUBLIC' }, ipAddress: '10.100.2.15', createdAt: new Date('2026-01-22T14:00:00Z') },
    { userId: editor2.id, action: 'QUESTION_BANK_CREATE', entityType: 'QuestionBank', entityId: medsBank.id, details: { title: medsBank.title }, ipAddress: '10.100.3.22', createdAt: new Date('2026-01-18T11:00:00Z') },
    { userId: users[0].id, action: 'QUIZ_ATTEMPT_COMPLETE', entityType: 'QuizAttempt', details: { bankTitle: blsBank.title, percentage: 87.5, passed: true }, ipAddress: '10.100.4.10', createdAt: new Date('2026-01-28T09:14:32Z') },
    { userId: users[1].id, action: 'USER_LOGIN', entityType: 'User', entityId: users[1].id, details: { method: 'password' }, ipAddress: '10.100.4.25', createdAt: new Date('2026-01-30T16:45:00Z') },
    { userId: admin.id, action: 'USER_DEACTIVATE', entityType: 'User', entityId: users[4].id, details: { reason: 'Left organisation' }, ipAddress: '10.100.1.50', createdAt: new Date('2026-01-25T10:00:00Z') },
    { userId: editor1.id, action: 'QUESTION_BANK_STATUS_CHANGE', entityType: 'QuestionBank', entityId: equipBank.id, details: { from: 'PUBLIC', to: 'ARCHIVED' }, ipAddress: '10.100.2.15', createdAt: new Date('2026-01-15T09:00:00Z') },
  ];

  await prisma.auditLog.createMany({ data: auditEntries });
  console.log('  ' + auditEntries.length + ' audit log entries created');

  // =========================================================================
  // INVITE TOKENS
  // =========================================================================
  await prisma.inviteToken.createMany({
    data: [
      { token: 'inv-bls-token-001', email: 'k.smith@health.qld.gov.au', firstName: 'Karen', surname: 'Smith', bankId: blsBank.id, expiresAt: new Date('2026-02-15T00:00:00Z') },
      { token: 'inv-bls-token-002', email: 't.brown@health.qld.gov.au', firstName: 'Tom', surname: 'Brown', bankId: blsBank.id, expiresAt: new Date('2026-02-15T00:00:00Z') },
      { token: 'inv-acls-token-001', email: 's.jones@health.qld.gov.au', firstName: 'Stephanie', surname: 'Jones', bankId: aclsBank.id, expiresAt: new Date('2026-02-28T00:00:00Z') },
      { token: 'inv-expired-001', email: 'p.garcia@health.qld.gov.au', firstName: 'Pablo', surname: 'Garcia', bankId: blsBank.id, expiresAt: new Date('2026-01-01T00:00:00Z') },
      { token: 'inv-used-001', email: 'b.thompson@health.qld.gov.au', firstName: 'Ben', surname: 'Thompson', bankId: blsBank.id, expiresAt: new Date('2026-03-01T00:00:00Z'), usedAt: new Date('2026-01-25T10:30:00Z') },
    ],
  });
  console.log('  5 invite tokens created');

  // =========================================================================
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
