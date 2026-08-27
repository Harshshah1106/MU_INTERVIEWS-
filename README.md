# 🎓 MU_INTERVIEWS

> **An open-source archive of real on-campus placement & internship interview experiences for Marwadi University (MU) students.**

[![GitHub Pages](https://img.shields.io/badge/Live_Site-Visit_Archive-10b981?style=flat&logo=github)](https://harshshah1106.github.io/MU_INTERVIEWS-/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-brightgreen.svg)](./CONTRIBUTING.md)

---

## 📖 About The Project

**MU_INTERVIEWS** is a community-driven repository containing real firsthand interview experiences, aptitude patterns, practical assignments, and technical/HR questions asked during on-campus recruitment drives at **Marwadi University**.

The primary goal is to provide transparent, high-yield preparation insights for students and juniors aiming to crack their dream placements.

---

## 🌐 Explore the Live Site

You can browse all experiences, filter by company, and search topics on our generated web interface:

👉 **[https://harshshah1106.github.io/MU_INTERVIEWS-/](https://harshshah1106.github.io/MU_INTERVIEWS-/)**

---

## 📂 Repository Structure

```
MU_INTERVIEWS-/
├── experiences/          # Real firsthand interview experience Markdown files
├── taxonomy.md           # Canonical company names, roles, round types, and topic tags
├── CONTRIBUTING.md       # Guidelines for submitting experiences (Issue form vs PR)
├── LICENSE               # MIT License
├── scripts/
│   └── build-site.js     # Static site generator script
├── docs/                 # Built static website (served via GitHub Pages)
└── .github/
    ├── ISSUE_TEMPLATE/
    │   └── interview-experience.yml  # Mobile-friendly issue form for zero-git submission
    └── workflows/
        └── build-site.yml            # Automated CI/CD workflow
```

---

## 🏢 Archived Companies (Current)

| Company | Role | Batch | Contributor | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Armakuni** | AI/ML Engineer | 2026 | @harsh | Unknown |
| **Cyperrox** | Software Developer | 2026 | @harsh | Unknown |
| **Meditab** | QA | 2026 | @harsh | Withdrew |
| **Optimumbrew** | Backend Developer | 2026 | @harsh | Unknown |
| **Pinnacle IIT** | Software Engineer | 2026 | @priyanshu-kumar | Selected |
| **ShipTurtle** | Backend Developer | 2026 | @harsh | Unknown |
| **Simform** | AI/ML Developer | 2026 | @harsh | Selected |
| **Streebo** | Backend Developer | 2026 | @harsh | Unknown |
| **Synoverge** | Junior Software Developer | 2026 | @harsh | Unknown |
| **TCS** | Backend Developer | 2026 | @nehang | Unknown |

---

## ✍️ How to Contribute

We welcome contributions from all MU students and alumni! We offer **two ways** to contribute:

### 🚀 Path A: GitHub Issue (Recommended — No Git Needed!)
Even if you've never used Git before, you can contribute directly from your web browser or the **GitHub Mobile App**:
1. Open the [**New Experience Submission Form**](https://github.com/Harshshah1106/MU_INTERVIEWS-/issues/new/choose).
2. Choose the **Interview Experience** template.
3. Fill in your company, role, rounds, and questions asked, then click **Submit**.

### 🛠️ Path B: Pull Request (For Git Users)
1. Fork the repo and create a branch.
2. Add a new file to `/experiences/` following the naming format `company-role-contributor.md`.
3. Fill out the YAML frontmatter and round descriptions according to [`taxonomy.md`](./taxonomy.md).
4. Run `node scripts/build-site.js` to ensure the build passes, then submit your Pull Request!

For full instructions, read our [**Contributing Guide (CONTRIBUTING.md)**](./CONTRIBUTING.md).

---

## 📜 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more details.
