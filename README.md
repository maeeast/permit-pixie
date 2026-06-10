# Maine Permit Practice - Whimsical Edition 🧚

A fully static version of the Maine driver's permit practice app.
No server, no build step, no dependencies. Pure HTML, CSS, and JavaScript.

**Live demo:** [Permit Pixie](https://maeeast.github.io/permit-pixie/)

---

## Features

- Multiple driver profiles (stored in browser localStorage)
- Study mode with answers and explanations
- Practice quizzes by section or topic
- Full 30-question mock exam (80% to pass)
- Missed questions review
- Per-topic progress tracking
- 143 questions covering all 11 sections of the Maine Driver's License Manual
- Whimsical woodland theme 🦄🧙🍄

---

## 🧚 User Guide

### Getting started

When you first open Permit Pixie you'll land on the welcome screen. Create a profile by entering your name and picking a mascot — this is how the app keeps your progress separate from other drivers using the same device. Once your profile is created, tap it to enter the app.

---

### The four study modes

#### 🧙 Study Mode
Browse every question in the bank with the answer and explanation always visible. Good for learning material before you've tried quizzing yourself on it. Pick a section or topic from the dropdowns, or leave both set to "All" to see everything. Tap any answer to reveal which one is correct and read the explanation, then step through with the Prev / Next buttons.

#### 🧚 Practice Quiz
A timed quiz on whatever slice of the material you choose. Select a section, a topic, and how many questions (10, 20, or 50), then work through them one at a time. After each answer you'll be asked how confident you were — this feeds into the missed-questions tracker. Your score and a full question review appear at the end.

#### 🦄 Mock Exam
Simulates the real Maine permit test. 30 randomly selected questions, and you need to answer at least 24 correctly (80%) to pass. No topic filter — questions are drawn from across the whole handbook, just like the actual exam.

#### 🍄 Missed Questions
Pulls together every question you've answered incorrectly across all past quizzes and lets you practice them as a focused set. A question stays in this pool until you answer it correctly and mark yourself as "Very Sure." Up to 20 questions at a time.

---

### After a quiz

Every completed quiz shows you:

- Your score and percentage
- A pass/fail result for mock exams, with a message from the woodland folk
- Your weakest topics overall (not just from this quiz) so you know where to focus
- A full question-by-question review with the correct answer and explanation for every question

---

### History

Tap **📜 History** in the top-right corner of the home screen (or from the results screen after any quiz) to see your full record.

- **Stats cards** at the top show total quizzes taken, mock exam count, your best mock score, your average mock score, and how many mocks you've passed.
- **Mock exam chart** plots every mock score over time once you have two or more attempts. Dots are green for passing scores and red for failing ones. The dashed line marks the passing threshold (24/30).
- **Attempt list** shows every quiz in reverse chronological order. Tap any row to see the full question review for that attempt.

---

### Saving and restoring your progress

Your progress is stored in your browser automatically, but browser storage can be cleared if you reset your browser or switch devices. To make sure your history is safe:

1. Go to **📜 History**
2. Tap **💾 Save Backup**
3. A file named `maine-permit-[your name]-[date].json` downloads to your device

To restore on any device or after a browser reset:

1. Open Permit Pixie and go to the welcome screen
2. Scroll down to **Restore from Backup**
3. Tap the file picker (or drag your backup file onto it) and select your `.json` file
4. Your profile and full history are restored immediately

Backups merge cleanly — if you restore a file onto a profile that already has some history, only new attempts are added. Nothing is overwritten.

---

### Tips for passing the real test

- **Do at least three or four mock exams** before your test date. The randomness means you'll see different question combinations each time.
- **Pay attention to your weakest topics** on the History screen. The Maine exam heavily tests alcohol/OUI laws, right-of-way rules, road signs, and speed limits — if any of those are showing below 80%, spend time in Study Mode on them.
- **Use the confidence tracker honestly.** If you're guessing and getting lucky, the app will keep flagging those questions in Missed Questions review until you can answer them with certainty.
- **The passing score is 24 out of 30 (80%).** That means you can only miss 6 questions. The mock exam is calibrated to match that exactly.

---

## Adding questions

Edit `data/questions.js`. Each question follows this format:

```javascript
{
  "section": "Section 6 – Rules of the Road",
  "topic": "Right of Way",
  "question": "When two vehicles arrive at an uncontrolled intersection...",
  "answer_a": "The vehicle on the left",
  "answer_b": "The vehicle on the right",
  "answer_c": "The larger vehicle",
  "answer_d": "The faster vehicle",
  "correct_answer": "B",
  "explanation": "At uncontrolled intersections, drivers on the left yield to drivers on the right."
}
```

Push your changes and the site redeploys automatically.

---

## File structure

```
maine-permit-static/
├── index.html              # Single-page app shell
├── css/
│   └── style.css           # Whimsical woodland theme
├── js/
│   ├── store.js            # localStorage data layer
│   └── app.js              # All app logic
└── data/
    └── questions.js        # Question bank (143 questions)
```
