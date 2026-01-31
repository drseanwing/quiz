# REdI Quiz Platform - User Guide

## Getting Started

### Creating an Account

1. Navigate to the quiz platform URL
2. Click **Register**
3. Fill in:
   - **Email** — must be a `@health.qld.gov.au` address
   - **Password** — minimum 8 characters with uppercase, lowercase, and a digit
   - **First Name** and **Surname**
4. Click **Register**

You'll be automatically logged in after registration.

### Logging In

1. Navigate to the quiz platform URL
2. Enter your email and password
3. Click **Sign In**

If you forget your password, click **Forgot Password?** to receive a reset link via email.

### Resetting Your Password

1. Click **Forgot Password?** on the login page
2. Enter your registered email address
3. Check your inbox for the reset email
4. Click the reset link (valid for 1 hour)
5. Enter your new password and confirm

### Invite Links

If you received an invite link from an administrator:

1. Click the invite link
2. Enter a password when prompted
3. If you're new, an account is created automatically
4. If you already have an account, your existing password is verified

---

## Dashboard

After logging in, you'll see your personal dashboard with:

- **Quizzes Completed** — total number of completed quizzes
- **Quizzes Passed** — number of quizzes where you met the passing score
- **Average Score** — your mean percentage across all completed quizzes
- **Continue Where You Left Off** — any in-progress quiz attempts
- **Recent Results** — your last 5 completed quiz results

### Quick Links

- **Browse Quizzes** — see all available quizzes
- **Manage Question Banks** — create and edit quizzes (editors and admins only)

---

## Taking a Quiz

### Starting a Quiz

1. Click **Browse Quizzes** from the dashboard or navigate to `/quizzes`
2. Review the available quizzes showing title, question count, time limit, and passing score
3. Click **Start Quiz** on any available quiz
4. If you have a previous in-progress attempt, you can **Resume** it instead

### During the Quiz

The quiz player shows:

- **Progress bar** — visual indicator of completion
- **Question navigation dots** — click to jump to any question
- **Timer** (if timed) — countdown in the header
- **Previous / Next buttons** — navigate between questions

### Question Types

**Multiple Choice (Single Answer)**
Select one option from the list by clicking on it.

**Multiple Choice (Multiple Answers)**
Check all correct options. The number of correct answers varies.

**True / False**
Click True or False.

**Drag to Order**
Drag items into the correct sequence from top to bottom.

**Image Map**
Click on the correct region of the displayed image.

**Slider**
Drag the slider to select a numeric value.

### Auto-Save

Your progress is automatically saved every 30 seconds. You can close the browser and resume later from the same point.

### Submitting the Quiz

1. Click **Submit Quiz** when you've answered all questions
2. Review the confirmation dialog
3. Click **Submit** to confirm

If the quiz has a time limit and the timer expires, your quiz is automatically submitted with whatever answers you've provided.

---

## Viewing Results

After submitting, the results page shows:

- **Score** — your earned points out of the maximum
- **Percentage** — your score as a percentage
- **Pass / Fail** — whether you met the passing threshold
- **Time Spent** — how long you took

### Question Review

Below the score card, each question is shown with:

- The question prompt
- **Your answer** — highlighted in green (correct) or red (incorrect)
- **Correct answer** — shown if your answer was wrong
- **Feedback** — explanation text (if the quiz has feedback enabled)
- **Reference link** — link to additional learning material (if provided)

Note: feedback visibility depends on the quiz's feedback timing setting. Some quizzes show feedback only at the end, some immediately after each question, and some not at all.

### Attempt History

Visit `/quizzes` to see all your past attempts including:

| Column    | Description                    |
| --------- | ------------------------------ |
| Quiz      | Question bank title            |
| Score     | Your percentage                |
| Result    | Pass or Fail                   |
| Date      | When you completed the quiz    |
| Best      | Your highest score on that quiz|

Click any past attempt to review your answers.

---

## Profile

Access your profile from the user menu (top-right avatar dropdown):

- **Dashboard** — return to your main dashboard
- **Sign Out** — log out of the platform

---

## Creating Question Banks (Editors)

Users with the EDITOR or ADMIN role can create and manage question banks.

### Creating a New Bank

1. Navigate to `/question-banks`
2. Click **Create Question Bank**
3. Fill in the title and optional description
4. Configure settings in the right panel

### Question Bank Settings

| Setting            | Description                                         |
| ------------------ | --------------------------------------------------- |
| Status             | DRAFT (private), OPEN (visible), ARCHIVED (hidden)  |
| Time Limit         | Seconds allowed (0 = unlimited)                     |
| Questions per Quiz | How many questions each attempt includes             |
| Passing Score      | Minimum percentage to pass (0-100)                   |
| Max Attempts       | How many times a user can take this quiz (0 = unlimited) |
| Randomize Questions| Shuffle question order for each attempt              |
| Randomize Answers  | Shuffle answer options for each attempt              |
| Feedback Timing    | When to show answer feedback (Immediate, End, Never) |
| Notification Email | Email address to notify on quiz completion           |

### Adding Questions

1. Open a question bank
2. Click **Add Question**
3. Select the question type
4. Fill in the prompt using the rich text editor
5. Configure the answer options (varies by type)
6. Add feedback text explaining the correct answer
7. Optionally add a reference link
8. Click **Save**

### Rich Text Editor

The question prompt and feedback editors support:
- **Bold**, *Italic*, <u>Underline</u>, ~~Strikethrough~~
- Headings (H1-H3)
- Bullet and numbered lists
- Block quotes and code blocks
- Links and images

### Reordering Questions

Drag question items in the question list to reorder them. The order is used for non-randomized quizzes.

### Duplicating

- **Duplicate a question** — creates a copy within the same bank
- **Duplicate a bank** — creates a copy of the entire bank with all questions

### Import / Export

- **Export** — downloads the question bank as a JSON file
- **Import** — upload a JSON file to create a new bank from previously exported data

---

## FAQ

**Q: Can I retake a quiz?**
A: Yes, unless the quiz creator has set a maximum number of attempts. Your best score is tracked.

**Q: What happens if my browser closes during a quiz?**
A: Your progress is auto-saved every 30 seconds. Navigate back to the quiz and click **Resume** to continue.

**Q: What happens if the timer runs out?**
A: Your quiz is automatically submitted with the answers you've provided so far.

**Q: Why can't I access a quiz?**
A: The quiz may be in DRAFT or ARCHIVED status. Only OPEN and PUBLIC quizzes are available to students.

**Q: I forgot my password. What do I do?**
A: Click "Forgot Password?" on the login page. A reset link will be sent to your email (valid for 1 hour).

**Q: I'm locked out of my account.**
A: After 5 failed login attempts, your account is temporarily locked for 15 minutes. Wait and try again, or ask an administrator to assist.
