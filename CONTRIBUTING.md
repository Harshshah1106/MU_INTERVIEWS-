# Contributing to MU_INTERVIEWS

Thank you for contributing your on-campus interview experience! By sharing what you encountered, you directly help your peers and juniors crack their placements and internships at Marwadi University.

There are **two ways** to contribute:

---

## 🚀 Path A: GitHub Issue (Default — No Git Required)

> **Recommended for everyone, especially if you're not familiar with Git.**  
> *This works seamlessly from any browser and even from the GitHub mobile app!*

1. Go to the [**New Issue**](https://github.com/Harshshah1106/MU_INTERVIEWS-/issues/new/choose) tab.
2. Select the **"Interview Experience"** template.
3. Fill out the structured form fields:
   - Company Name
   - Role / Designation
   - Year / Batch
   - Outcome / Status (`selected`, `rejected`, `withdrew`, `unknown`)
   - Your Name / GitHub handle (or type `Anonymous`)
   - Details of each round (Aptitude, Practical, Technical, HR, etc.) with difficulty levels and questions asked.
4. Click **"Submit new issue"**.
5. Maintainers will review the submission, convert it into a markdown file in `/experiences/`, and merge it into the archive.

---

## 🛠️ Path B: Pull Request (For Git-Fluent Contributors)

If you are comfortable using Git and Markdown, you can submit directly via a Pull Request:

### 1. Fork and Clone
```bash
git clone https://github.com/<your-username>/MU_INTERVIEWS-.git
cd MU_INTERVIEWS-
```

### 2. Create a New Branch
```bash
git checkout -b add-experience-<company>-<role>
```

### 3. Add Your Experience File
Create a new file in the `/experiences/` directory using the canonical naming convention:
```
experiences/<company>-<role>-<contributor>.md
```
*Example:* `experiences/tatvasoft-fullstack-harsh.md`

### 4. File Format & Schema
Every experience file must start with YAML frontmatter, followed by markdown sections for each round:

```markdown
---
company: Company Name
role: Role Title
contributor: your-name-or-handle
year: 2026
status: selected
---

## Aptitude Round — Easy-Medium
- Quants: number system, time and work, percentage
- Logical Reasoning: series, directions
- Technical MCQ: basic C/C++ fundamentals

## Technical Round — Medium
1. Reverse a linked list in-place
2. Explain differences between SQL and NoSQL databases
3. OOP concepts (Polymorphism with real-world examples)

## HR Round — Easy
- Tell me about yourself
- Why do you want to join our company?
- Are you willing to relocate?
```

> **Note on Conventions:**
> - Refer to [`taxonomy.md`](./taxonomy.md) for canonical company names, role names, round types, and topic tags.
> - `status` must be one of: `selected`, `rejected`, `withdrew`, or `unknown`.
> - Round heading format: `## <Round Type> — <Difficulty>` (e.g., `## Technical Round — Medium`).

### 5. Test & Commit
Run the build script to make sure the site builds cleanly:
```bash
node scripts/build-site.js
```

Commit and push your changes:
```bash
git add experiences/
git commit -m "feat(experience): add <Company> <Role> experience by <Contributor>"
git push origin add-experience-<company>-<role>
```

### 6. Open a Pull Request
Go to the repository on GitHub and click **"Compare & pull request"**. Describe your submission and submit!

---

## 📜 Code of Conduct & Guidelines
- Please share honest, accurate details to give realistic expectations to juniors.
- Do not post proprietary, confidential internal assessment keys, NDA-restricted material, or offensive content.
- Be respectful and supportive in discussion threads.
