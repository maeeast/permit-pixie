# Maine Permit Practice — GitHub Pages Edition 🧚

A fully static version of the Maine driver's permit practice app.
No server, no build step, no dependencies. Pure HTML, CSS, and JavaScript.

**Live demo:** `https://YOUR_USERNAME.github.io/maine-permit-static/`

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

## Limitations vs. the full-stack version

| Feature | This version | Full-stack version |
|---|---|---|
| Multiple profiles | ✅ localStorage | ✅ Database |
| Progress tracking | ✅ Per device/browser | ✅ Cross-device |
| Accounts / login | ❌ | ✅ |
| Progress sync across devices | ❌ | ✅ |
| Hosting required | GitHub Pages (free) | EC2 or Render |

---

## Deploy to GitHub Pages in 3 steps

### 1. Create a new GitHub repo

Go to github.com → New repository. Name it `maine-permit` (or anything you like).
Make it **public** (required for free GitHub Pages).

### 2. Push this project

```bash
git init
git add .
git commit -m "Maine permit practice app"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 3. Enable GitHub Pages

In your repo on GitHub:
- Go to **Settings → Pages**
- Under **Source**, select **GitHub Actions**
- The workflow in `.github/workflows/deploy.yml` runs automatically on every push to `main`
- Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

That's it. No build step, no configuration — it deploys the files exactly as they are.

---

## Custom domain (optional)

In **Settings → Pages → Custom domain**, enter your domain.
Then add a CNAME record pointing to `YOUR_USERNAME.github.io` with your DNS provider.

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
