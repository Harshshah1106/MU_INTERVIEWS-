const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXPERIENCES_DIR = path.join(ROOT_DIR, 'experiences');
const TAXONOMY_PATH = path.join(ROOT_DIR, 'taxonomy.md');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const COMPANIES_DIR = path.join(DOCS_DIR, 'companies');
const ROUNDS_DIR = path.join(DOCS_DIR, 'rounds');
const TOPICS_DIR = path.join(DOCS_DIR, 'topics');

// Helper to convert string to URL-friendly slug
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

// 1. Parse taxonomy.md
function parseTaxonomy() {
  if (!fs.existsSync(TAXONOMY_PATH)) {
    console.error('❌ Error: taxonomy.md not found at ' + TAXONOMY_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(TAXONOMY_PATH, 'utf-8');
  const taxonomy = {
    companies: [],
    roles: [],
    roundTypes: [],
    topics: []
  };

  let currentSection = null;

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line.startsWith('# Canonical Companies')) {
      currentSection = 'companies';
    } else if (line.startsWith('# Canonical Roles')) {
      currentSection = 'roles';
    } else if (line.startsWith('# Canonical Round Types')) {
      currentSection = 'roundTypes';
    } else if (line.startsWith('# Canonical Topics')) {
      currentSection = 'topics';
    } else if (line.startsWith('#')) {
      currentSection = null;
    } else if (line && currentSection) {
      const items = line.split(',').map(s => s.trim().replace(/,$/, '')).filter(Boolean);
      taxonomy[currentSection].push(...items);
    }
  });

  return taxonomy;
}

// 2. Parse Markdown experience file
function parseExperienceFile(filename, taxonomy) {
  const fullPath = path.join(EXPERIENCES_DIR, filename);
  const content = fs.readFileSync(fullPath, 'utf-8');

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    console.error(`❌ Validation Error in ${filename}: Invalid or missing YAML frontmatter.`);
    process.exit(1);
  }

  const rawYaml = match[1];
  const body = match[2].trim();
  const metadata = {};

  rawYaml.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      metadata[key] = value;
    }
  });

  // Strict Validation against taxonomy.md
  if (!metadata.company) {
    console.error(`❌ Validation Error in ${filename}: Missing 'company' field in frontmatter.`);
    process.exit(1);
  }
  if (!metadata.role) {
    console.error(`❌ Validation Error in ${filename}: Missing 'role' field in frontmatter.`);
    process.exit(1);
  }

  // Check company against taxonomy (case-insensitive)
  const matchedCompany = taxonomy.companies.find(c => c.toLowerCase() === metadata.company.toLowerCase());
  if (!matchedCompany) {
    console.error(`❌ Validation Error in ${filename}: Company '${metadata.company}' is not listed in canonical taxonomy.md.`);
    console.error(`   Allowed companies: ${taxonomy.companies.join(', ')}`);
    process.exit(1);
  }

  // Check role against taxonomy (case-insensitive)
  const matchedRole = taxonomy.roles.find(r => r.toLowerCase() === metadata.role.toLowerCase());
  if (!matchedRole) {
    console.error(`❌ Validation Error in ${filename}: Role '${metadata.role}' is not listed in canonical taxonomy.md.`);
    console.error(`   Allowed roles: ${taxonomy.roles.join(', ')}`);
    process.exit(1);
  }

  // Parse rounds from markdown body (e.g. ## Aptitude Round — Easy)
  const roundRegex = /##\s+([^—\n\r]+)(?:—|-)\s*([^\n\r]+)\r?\n([\s\S]*?)(?=(?:##\s+|$))/g;
  const rounds = [];
  let roundMatch;

  while ((roundMatch = roundRegex.exec(body)) !== null) {
    const roundTitle = roundMatch[1].trim();
    const difficulty = roundMatch[2].trim();
    const details = roundMatch[3].trim();

    // Map to canonical round type if possible
    let canonicalType = taxonomy.roundTypes.find(rt => 
      roundTitle.toLowerCase().includes(rt.toLowerCase().replace(' round', '')) ||
      rt.toLowerCase().includes(roundTitle.toLowerCase().replace(' round', ''))
    ) || roundTitle;

    // Detect canonical topics mentioned in this round
    const detectedTopics = [];
    const textToScan = (roundTitle + ' ' + details).toLowerCase();

    taxonomy.topics.forEach(topic => {
      const topicNormalized = topic.replace(/-/g, ' ');
      // Special regex patterns for key topics
      let pattern;
      if (topic === 'react') pattern = /\breact\b|\breact\.?js\b/i;
      else if (topic === 'c-fundamentals') pattern = /\bc\b|\bc\+\+|\bc fundamentals\b/i;
      else if (topic === 'sql-queries') pattern = /\bsql\b|\bsql queries\b/i;
      else if (topic === 'sql-joins') pattern = /\bjoins?\b|\btriple join\b/i;
      else if (topic === 'sql-ranking') pattern = /\branking\b|\brank\(\)/i;
      else if (topic === 'dsa-array') pattern = /\barray\b|\barrays\b/i;
      else if (topic === 'dsa-queue') pattern = /\bqueue\b/i;
      else if (topic === 'dsa-string') pattern = /\bstring\b|\bsubsequence\b/i;
      else if (topic === 'oop-concepts') pattern = /\boop\b|\boops\b|\bpolymorphism\b|\binheritance\b/i;
      else if (topic === 'generative-ai') pattern = /\bgenerative ai\b|\bgen ai\b|\bai tools\b/i;
      else if (topic === 'deep-learning') pattern = /\bdeep learning\b|\bneural\b/i;
      else if (topic === 'supervised-unsupervised-learning') pattern = /\bsupervised\b|\bunsupervised\b/i;
      else if (topic === 'time-complexity') pattern = /\bcomplexity\b|\btime complexity\b|\bgraph traversal\b/i;
      else if (topic === 'train-speed-distance') pattern = /\btrain\b|\bspeed.*distance\b/i;
      else if (topic === 'work-and-time') pattern = /\bwork.*time\b|\bwork and time\b/i;
      else if (topic === 'number-system') pattern = /\bnumber system\b|\bnumbers?\b/i;
      else if (topic === 'profit-loss') pattern = /\bprofit.*loss\b/i;
      else if (topic === 'lcm-hcf') pattern = /\blcm\b|\bhcf\b/i;
      else if (topic === 'data-interpretation') pattern = /\bdata interpretation\b/i;
      else if (topic === 'english-synonyms-antonyms') pattern = /\bsynonyms\b|\bantonyms\b|\benglish\b/i;
      else if (topic === 'essay-writing') pattern = /\bessay\b/i;
      else if (topic === 'seating-arrangement') pattern = /\bseating\b/i;
      else if (topic === 'group-discussion') pattern = /\bgroup discussion\b|\bgd\b/i;
      else if (topic === 'hr-scenario-based') pattern = /\bscenario\b/i;
      else if (topic === 'resume-based') pattern = /\bresume\b/i;
      else pattern = new RegExp(`\\b${topicNormalized}\\b`, 'i');

      if (pattern.test(textToScan)) {
        detectedTopics.push(topic);
      }
    });

    rounds.push({
      title: roundTitle,
      canonicalType,
      typeSlug: slugify(canonicalType),
      difficulty,
      difficultyNormalized: getDifficultyCategory(difficulty),
      details,
      topics: detectedTopics
    });
  }

  // All topics in this experience
  const allExperienceTopics = [...new Set(rounds.flatMap(r => r.topics))];

  return {
    filename,
    company: matchedCompany,
    companySlug: slugify(matchedCompany),
    role: matchedRole,
    roleSlug: slugify(matchedRole),
    contributor: metadata.contributor || 'anonymous',
    year: metadata.year || '2026',
    status: metadata.status || 'unknown',
    rounds,
    topics: allExperienceTopics,
    rawBody: body
  };
}

function getDifficultyCategory(diff) {
  const d = diff.toLowerCase();
  if (d.includes('easy') && !d.includes('medium')) return 'Easy';
  if (d.includes('hard')) return 'Hard';
  if (d.includes('medium')) return 'Medium';
  return 'N/A';
}

function getDifficultyBadge(diff) {
  const d = diff.toLowerCase();
  if (d.includes('easy') && !d.includes('medium')) {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">${diff}</span>`;
  }
  if (d.includes('hard')) {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-950/80 text-rose-300 border border-rose-800/80">${diff}</span>`;
  }
  if (d.includes('medium')) {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800/80">${diff}</span>`;
  }
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">${diff}</span>`;
}

function getStatusBadge(status, rounds = []) {
  const s = (status || '').toLowerCase();
  if (s === 'selected') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Selected</span>`;
  }
  if (s === 'withdrew') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/90 text-amber-300 border border-amber-700/80 shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Withdrew</span>`;
  }
  if (s === 'rejected') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/90 text-rose-300 border border-rose-700/80 shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>Rejected</span>`;
  }

  // When status is unknown or unspecified, show the last attended/documented round
  if (rounds && rounds.length > 0) {
    const lastRound = rounds[rounds.length - 1];
    // Clean up round title if it contains extra parenthetical details
    const cleanTitle = lastRound.title.split('(')[0].trim();
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900/90 text-cyan-300 border border-cyan-700/60 shadow-sm" title="Last documented stage"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>Till ${cleanTitle}</span>`;
  }

  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800/90 text-slate-300 border border-slate-700">Outcome Unknown</span>`;
}

function renderMarkdownToHtml(md, rootPrefix = '') {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<h4 class="text-xs font-semibold text-slate-200 mt-2 mb-1">$1</h4>')
    .replace(/^\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-slate-300 text-xs sm:text-sm mb-1 leading-relaxed">$1</li>')
    .replace(/^-\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-300 text-xs sm:text-sm mb-1 leading-relaxed">$1</li>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[11px] border border-slate-700/80">$1</code>')
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, '<br/>');
}

// Global Shell Template for all generated pages
function renderPageShell({ title, description, content, rootPrefix = '', activeNav = 'home' }) {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | MU_INTERVIEWS</title>
  <meta name="description" content="${description}" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            slate: {
              850: '#111827',
              900: '#0b0f19',
              950: '#060911',
            }
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #07090e;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", sans-serif;
      letter-spacing: -0.01em;
    }
    .glass-panel {
      background: rgba(13, 17, 28, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.07);
      box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.3);
    }
    .glass-card {
      background: rgba(15, 21, 37, 0.6);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .glass-card:hover {
      background: rgba(20, 28, 48, 0.85);
      border-color: rgba(52, 211, 153, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 12px 30px -10px rgba(16, 185, 129, 0.15);
    }
    .glow-header {
      background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.18), transparent 70%);
    }
    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #07090e;
    }
    ::-webkit-scrollbar-thumb {
      background: #1e293b;
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #334155;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
  <!-- Top Radial Ambient Glow -->
  <div class="fixed top-0 left-0 right-0 h-[480px] glow-header pointer-events-none -z-10"></div>

  <!-- Navigation Bar -->
  <header class="sticky top-0 z-50 border-b border-white/[0.08] bg-[#07090e]/80 backdrop-blur-xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <a href="${rootPrefix}index.html" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-[#07090e] text-xs shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            MU
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm sm:text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">MU_INTERVIEWS</span>
            <span class="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 hidden sm:inline-block">v1.0</span>
          </div>
        </a>

        <!-- Desktop Quick Links -->
        <nav class="hidden md:flex items-center gap-1 text-xs font-medium text-slate-400">
          <a href="${rootPrefix}index.html" class="px-3 py-1.5 rounded-lg ${activeNav === 'home' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'} transition-all">All Archives</a>
          <a href="${rootPrefix}index.html#insights" class="px-3 py-1.5 rounded-lg ${activeNav === 'insights' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'} transition-all">Interactive Insights</a>
        </nav>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <a href="https://github.com/Harshshah1106/MU_INTERVIEWS-/issues/new/choose" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-[#07090e] transition-all shadow-sm shadow-emerald-500/20 active:scale-95">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          <span>Submit Experience</span>
        </a>
        <a href="https://github.com/Harshshah1106/MU_INTERVIEWS-" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all">
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          <span class="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Page Content -->
  <div class="flex-1">
    ${content}
  </div>

  <!-- Footer -->
  <footer class="border-t border-white/[0.08] bg-[#05070a] py-12 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 space-y-4">
      <div class="flex items-center justify-center gap-2">
        <div class="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">MU</div>
        <span class="font-semibold text-slate-300">Marwadi University On-Campus Placement Archive</span>
      </div>
      <p class="text-slate-400 max-w-lg mx-auto leading-relaxed">
        Built by students for students. First-hand on-campus interview questions, patterns, and tips.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-400 pt-2 font-medium">
        <a href="${rootPrefix}index.html" class="hover:text-emerald-400 transition-colors">Home</a>
        <span>•</span>
        <a href="https://github.com/Harshshah1106/MU_INTERVIEWS-" class="hover:text-emerald-400 transition-colors">Repository</a>
        <span>•</span>
        <a href="https://github.com/Harshshah1106/MU_INTERVIEWS-/blob/main/CONTRIBUTING.md" class="hover:text-emerald-400 transition-colors">Submit Experience</a>
        <span>•</span>
        <a href="https://github.com/Harshshah1106/MU_INTERVIEWS-/blob/main/taxonomy.md" class="hover:text-emerald-400 transition-colors">Canonical Taxonomy</a>
        <span>•</span>
        <a href="https://github.com/Harshshah1106/MU_INTERVIEWS-/blob/main/LICENSE" class="hover:text-emerald-400 transition-colors">MIT License</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

// 3. Main Build Routine
function build() {
  console.log('🚀 [PHASE 3] Starting static site build & taxonomy validation...');

  const taxonomy = parseTaxonomy();
  console.log(`📋 Taxonomy loaded: ${taxonomy.companies.length} companies, ${taxonomy.roles.length} roles, ${taxonomy.roundTypes.length} round types, ${taxonomy.topics.length} topics.`);

  // Create target directories
  [DOCS_DIR, COMPANIES_DIR, ROUNDS_DIR, TOPICS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const experienceFiles = fs.readdirSync(EXPERIENCES_DIR).filter(f => f.endsWith('.md'));
  console.log(`📂 Found ${experienceFiles.length} experience files in /experiences/`);

  // Parse and strictly validate every file
  const experiences = experienceFiles.map(file => parseExperienceFile(file, taxonomy));
  console.log('✅ All experience files passed strict taxonomy validation!');

  // Sort experiences: latest year first, then company name
  experiences.sort((a, b) => b.year.localeCompare(a.year) || a.company.localeCompare(b.company));

  // Compute Aggregations
  const companyCounts = {};
  const roundCounts = {};
  const topicCounts = {};
  const roleCounts = {};
  let totalRounds = 0;

  experiences.forEach(exp => {
    companyCounts[exp.company] = (companyCounts[exp.company] || 0) + 1;
    roleCounts[exp.role] = (roleCounts[exp.role] || 0) + 1;
    exp.rounds.forEach(r => {
      totalRounds++;
      roundCounts[r.canonicalType] = (roundCounts[r.canonicalType] || 0) + 1;
    });
    exp.topics.forEach(t => {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
  });

  // Full structured dataset for data.json
  const dataset = {
    generatedAt: new Date().toISOString(),
    stats: {
      totalExperiences: experiences.length,
      totalCompanies: Object.keys(companyCounts).length,
      totalRounds,
      totalTopics: Object.keys(topicCounts).length,
      companyCounts,
      roundCounts,
      topicCounts,
      roleCounts
    },
    taxonomy,
    experiences
  };

  // Emit data.json into /docs/
  fs.writeFileSync(path.join(DOCS_DIR, 'data.json'), JSON.stringify(dataset, null, 2));
  console.log('📄 Emitted /docs/data.json');

  // -------------------------------------------------------------
  // Generate Landing Page: index.html
  // -------------------------------------------------------------
  const uniqueCompanies = Object.keys(companyCounts).sort();
  const uniqueRoles = Object.keys(roleCounts).sort();
  const uniqueTopics = Object.keys(topicCounts).sort();

  const indexContent = `
  <!-- Hero Section -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8 text-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-white/10 text-xs text-slate-300 mb-6 shadow-sm">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      Marwadi University • On-Campus Interview Vault
    </div>
    
    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
      Real On-Campus <br class="hidden sm:inline"/>
      <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Interview Experiences</span>
    </h1>
    <p class="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 mb-10 leading-relaxed font-normal">
      High-yield archive of actual aptitude questions, technical rounds, coding tasks, and HR interviews experienced by Marwadi University students. Click any card to explore company blueprints.
    </p>

    <!-- Top Key Metrics Strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 max-w-4xl mx-auto mb-12">
      <div class="glass-panel p-4 sm:p-5 rounded-2xl text-center">
        <div class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">${experiences.length}</div>
        <div class="text-xs text-slate-400 font-medium mt-1">Experiences</div>
      </div>
      <div class="glass-panel p-4 sm:p-5 rounded-2xl text-center">
        <div class="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">${uniqueCompanies.length}</div>
        <div class="text-xs text-slate-400 font-medium mt-1">Companies</div>
      </div>
      <div class="glass-panel p-4 sm:p-5 rounded-2xl text-center">
        <div class="text-3xl sm:text-4xl font-extrabold text-teal-300 tracking-tight">${totalRounds}</div>
        <div class="text-xs text-slate-400 font-medium mt-1">Documented Rounds</div>
      </div>
      <div class="glass-panel p-4 sm:p-5 rounded-2xl text-center">
        <div class="text-3xl sm:text-4xl font-extrabold text-cyan-400 tracking-tight">${uniqueTopics.length}</div>
        <div class="text-xs text-slate-400 font-medium mt-1">Tagged Topics</div>
      </div>
    </div>
  </section>

  <!-- Interactive Charts Section -->
  <section id="insights" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">Recruitment Insights</h2>
        <p class="text-xs text-slate-400">Interactive live breakdown based on current submissions</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Bar Chart: Experiences per Company -->
      <div class="glass-panel p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Submissions by Company</h3>
          <span class="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">Live Breakdown</span>
        </div>
        <div class="relative h-64 sm:h-72 w-full">
          <canvas id="companyBarChart"></canvas>
        </div>
      </div>

      <!-- Donut Chart: Round Types Distribution -->
      <div class="glass-panel p-5 rounded-2xl flex flex-col justify-between">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Round Type Distribution</h3>
          <span class="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">${totalRounds} Rounds</span>
        </div>
        <div class="relative h-64 sm:h-72 w-full flex items-center justify-center">
          <canvas id="roundDonutChart"></canvas>
        </div>
      </div>
    </div>
  </section>

  <!-- Filter & Search Command Bar -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
    <div class="glass-panel p-5 rounded-2xl space-y-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <!-- Main Text Search -->
        <div class="relative flex-1">
          <input type="text" id="liveSearchInput" placeholder="Search questions, companies, topics (e.g. SQL, React, Simform, TCS)..." 
                 class="w-full px-4 py-3 pl-11 rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner" />
          <svg class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>

        <!-- Filter Selects -->
        <div class="grid grid-cols-2 sm:flex gap-2">
          <!-- Company Filter -->
          <select id="filterCompanySelect" class="px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-emerald-500">
            <option value="all">All Companies (${uniqueCompanies.length})</option>
            ${uniqueCompanies.map(c => `<option value="${slugify(c)}">${c}</option>`).join('')}
          </select>

          <!-- Role Filter -->
          <select id="filterRoleSelect" class="px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-emerald-500">
            <option value="all">All Roles (${uniqueRoles.length})</option>
            ${uniqueRoles.map(r => `<option value="${slugify(r)}">${r}</option>`).join('')}
          </select>

          <!-- Difficulty Filter -->
          <select id="filterDiffSelect" class="px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-emerald-500">
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <!-- Topic Filter -->
          <select id="filterTopicSelect" class="px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-emerald-500">
            <option value="all">All Topics (${uniqueTopics.length})</option>
            ${uniqueTopics.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Quick Topic Chips -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span class="text-slate-500 shrink-0 text-[11px] font-medium uppercase tracking-wider">Top Topics:</span>
        ${uniqueTopics.slice(0, 10).map(t => `
          <button onclick="setTopicFilter('${t}')" class="topic-pill shrink-0 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 text-[11px] font-mono transition-colors">
            #${t}
          </button>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Live Experiences Feed -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-bold text-white tracking-tight">Interview Archives</h2>
        <span id="resultsBadge" class="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-white/10">
          Showing ${experiences.length} of ${experiences.length}
        </span>
      </div>
      <button onclick="resetFilters()" id="resetBtn" class="text-xs text-slate-500 hover:text-slate-300 hidden transition-colors">
        Clear filters ✕
      </button>
    </div>

    <!-- Experiences Grid -->
    <div id="cardsGrid" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${experiences.map((exp, idx) => {
        const diffCategories = exp.rounds.map(r => r.difficultyNormalized.toLowerCase()).join(' ');
        const topicsString = exp.topics.join(' ');
        return `
        <article class="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between exp-card cursor-pointer group hover:border-emerald-500/40 relative"
                 onclick="if (!event.target.closest('a') && !event.target.closest('button')) window.location.href='companies/${exp.companySlug}.html'"
                 data-company-slug="${exp.companySlug}"
                 data-role-slug="${exp.roleSlug}"
                 data-difficulties="${diffCategories}"
                 data-topics="${topicsString}"
                 data-search="${(exp.company + ' ' + exp.role + ' ' + exp.contributor + ' ' + exp.rawBody + ' ' + topicsString).toLowerCase().replace(/"/g, '&quot;')}">
          <div>
            <!-- Header -->
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <div class="flex items-center gap-2">
                  <a href="companies/${exp.companySlug}.html" class="text-xl font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5">
                    <span>${exp.company}</span>
                    <svg class="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                  </a>
                </div>
                <div class="text-xs sm:text-sm font-medium text-emerald-400 mt-0.5">${exp.role}</div>
              </div>
              <div class="flex flex-col items-end gap-1.5">
                ${getStatusBadge(exp.status, exp.rounds)}
                <span class="text-[11px] text-slate-500 font-mono">Batch ${exp.year}</span>
              </div>
            </div>

            <!-- Contributor & Metadata -->
            <div class="flex items-center justify-between text-xs text-slate-400 mb-5 pb-4 border-b border-white/[0.06]">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  @${exp.contributor}
                </span>
                <span>•</span>
                <span class="text-slate-400">${exp.rounds.length} ${exp.rounds.length === 1 ? 'Round' : 'Rounds'}</span>
              </div>
              <span class="text-[11px] font-medium text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex items-center gap-0.5">
                Deep Dive ↗
              </span>
            </div>

            <!-- Round Cards Breakdown -->
            <div class="space-y-3.5">
              ${exp.rounds.map(r => `
                <div class="bg-slate-900/70 rounded-xl p-3.5 border border-white/[0.06]">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <a href="rounds/${r.typeSlug}.html" class="text-xs font-semibold text-slate-200 hover:text-emerald-400 transition-colors inline-flex items-center gap-1">
                      ${r.title}
                      <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </a>
                    ${getDifficultyBadge(r.difficulty)}
                  </div>
                  <div class="text-xs text-slate-300 leading-relaxed font-sans">
                    ${renderMarkdownToHtml(r.details)}
                  </div>
                  ${r.topics.length > 0 ? `
                    <div class="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-white/[0.04]">
                      ${r.topics.map(t => `
                        <a href="topics/${t}.html" class="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 border border-white/5 text-[10px] font-mono transition-colors">
                          #${t}
                        </a>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Card Footer -->
          <div class="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
            <span class="font-mono text-[11px] text-slate-500 truncate max-w-[200px]">${exp.filename}</span>
            <a href="https://github.com/Harshshah1106/MU_INTERVIEWS-/blob/main/experiences/${exp.filename}" target="_blank" rel="noopener noreferrer" 
               class="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1">
              <span>View Source</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          </div>
        </article>
        `;
      }).join('')}
    </div>

    <!-- Empty State -->
    <div id="noResults" class="hidden glass-panel rounded-2xl p-12 text-center my-8">
      <div class="w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      </div>
      <h3 class="text-base font-semibold text-white mb-1">No matching experiences found</h3>
      <p class="text-xs text-slate-400 mb-4">Try clearing filters or searching for different keywords.</p>
      <button onclick="resetFilters()" class="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition-colors">Reset All Filters</button>
    </div>
  </main>

  <script>
    // Embedded Data for Instant Client-Side Charts & Filtering
    const companyStats = ${JSON.stringify(companyCounts)};
    const roundStats = ${JSON.stringify(roundCounts)};

    // Initialize Chart.js
    document.addEventListener('DOMContentLoaded', () => {
      // 1. Company Bar Chart
      const ctxCompany = document.getElementById('companyBarChart');
      if (ctxCompany) {
        new Chart(ctxCompany, {
          type: 'bar',
          data: {
            labels: Object.keys(companyStats),
            datasets: [{
              label: 'Experiences',
              data: Object.values(companyStats),
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              borderColor: 'rgba(52, 211, 153, 1)',
              borderWidth: 1,
              borderRadius: 6,
              hoverBackgroundColor: 'rgba(52, 211, 153, 0.95)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#34d399',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8
              }
            },
            scales: {
              x: {
                ticks: { color: '#94a3b8', font: { size: 10, family: 'Inter' } },
                grid: { display: false }
              },
              y: {
                ticks: { color: '#94a3b8', stepSize: 1, font: { size: 10, family: 'Inter' } },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
              }
            }
          }
        });
      }

      // 2. Round Donut Chart
      const ctxRound = document.getElementById('roundDonutChart');
      if (ctxRound) {
        new Chart(ctxRound, {
          type: 'doughnut',
          data: {
            labels: Object.keys(roundStats),
            datasets: [{
              data: Object.values(roundStats),
              backgroundColor: [
                '#10b981',
                '#06b6d4',
                '#3b82f6',
                '#8b5cf6',
                '#f59e0b',
                '#ec4899',
                '#64748b'
              ],
              borderColor: '#07090e',
              borderWidth: 2,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#94a3b8',
                  font: { size: 10, family: 'Inter' },
                  boxWidth: 10,
                  padding: 10
                }
              },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#f8fafc',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8
              }
            },
            cutout: '70%'
          }
        });
      }
    });

    // Client-side filtering logic
    const searchInput = document.getElementById('liveSearchInput');
    const compSelect = document.getElementById('filterCompanySelect');
    const roleSelect = document.getElementById('filterRoleSelect');
    const diffSelect = document.getElementById('filterDiffSelect');
    const topicSelect = document.getElementById('filterTopicSelect');
    const cards = document.querySelectorAll('.exp-card');
    const resultsBadge = document.getElementById('resultsBadge');
    const resetBtn = document.getElementById('resetBtn');
    const noResults = document.getElementById('noResults');

    function applyLiveFilters() {
      const q = searchInput.value.toLowerCase().trim();
      const comp = compSelect.value;
      const role = roleSelect.value;
      const diff = diffSelect.value.toLowerCase();
      const topic = topicSelect.value;

      let visible = 0;
      const isFiltered = (q !== '' || comp !== 'all' || role !== 'all' || diff !== 'all' || topic !== 'all');

      if (isFiltered) {
        resetBtn.classList.remove('hidden');
      } else {
        resetBtn.classList.add('hidden');
      }

      cards.forEach(card => {
        const cardComp = card.getAttribute('data-company-slug');
        const cardRole = card.getAttribute('data-role-slug');
        const cardDiffs = card.getAttribute('data-difficulties');
        const cardTopics = card.getAttribute('data-topics').split(' ');
        const cardSearch = card.getAttribute('data-search');

        const matchComp = (comp === 'all' || cardComp === comp);
        const matchRole = (role === 'all' || cardRole === role);
        const matchDiff = (diff === 'all' || cardDiffs.includes(diff));
        const matchTopic = (topic === 'all' || cardTopics.includes(topic));
        const matchSearch = (!q || cardSearch.includes(q));

        if (matchComp && matchRole && matchDiff && matchTopic && matchSearch) {
          card.style.display = 'flex';
          visible++;
        } else {
          card.style.display = 'none';
        }
      });

      resultsBadge.innerText = 'Showing ' + visible + ' of ' + cards.length;

      if (visible === 0) {
        noResults.classList.remove('hidden');
      } else {
        noResults.classList.add('hidden');
      }
    }

    function setTopicFilter(t) {
      topicSelect.value = t;
      applyLiveFilters();
    }

    function resetFilters() {
      searchInput.value = '';
      compSelect.value = 'all';
      roleSelect.value = 'all';
      diffSelect.value = 'all';
      topicSelect.value = 'all';
      applyLiveFilters();
    }

    searchInput.addEventListener('input', applyLiveFilters);
    compSelect.addEventListener('change', applyLiveFilters);
    roleSelect.addEventListener('change', applyLiveFilters);
    diffSelect.addEventListener('change', applyLiveFilters);
    topicSelect.addEventListener('change', applyLiveFilters);
  </script>
  `;

  const indexHtml = renderPageShell({
    title: 'MU_INTERVIEWS — On-Campus Placement Archive',
    description: 'Archive of real on-campus interview questions, tests, and tips from Marwadi University.',
    content: indexContent,
    rootPrefix: '',
    activeNav: 'home'
  });

  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), indexHtml);
  console.log('✅ Generated /docs/index.html');

  // -------------------------------------------------------------
  // Generate Company Pages: /docs/companies/<slug>.html
  // -------------------------------------------------------------
  taxonomy.companies.forEach(company => {
    const compSlug = slugify(company);
    const compExps = experiences.filter(e => e.company.toLowerCase() === company.toLowerCase());
    const compRounds = compExps.reduce((acc, e) => acc + e.rounds.length, 0);
    const compRoles = [...new Set(compExps.map(e => e.role))];
    const compTopics = [...new Set(compExps.flatMap(e => e.topics))];

    const companyContent = `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <a href="../index.html" class="hover:text-emerald-400 transition-colors">Home</a>
        <span>/</span>
        <span>Companies</span>
        <span>/</span>
        <span class="text-white font-medium">${company}</span>
      </nav>

      <!-- Company Profile Banner -->
      <div class="glass-panel p-6 sm:p-8 rounded-2xl mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs font-semibold border border-emerald-800/80 mb-2">
              Campus Recruiter
            </div>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">${company}</h1>
            <p class="text-xs sm:text-sm text-slate-400 mt-1">On-campus interview experiences and round blueprints</p>
          </div>
          <div class="flex items-center gap-3">
            <a href="https://github.com/Harshshah1106/MU_INTERVIEWS-/issues/new/choose" target="_blank" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors">
              + Add ${company} Experience
            </a>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-center">
          <div class="bg-slate-900/60 p-3.5 rounded-xl border border-white/5">
            <div class="text-2xl font-bold text-white">${compExps.length}</div>
            <div class="text-[11px] text-slate-400">Experiences</div>
          </div>
          <div class="bg-slate-900/60 p-3.5 rounded-xl border border-white/5">
            <div class="text-2xl font-bold text-emerald-400">${compRoles.length}</div>
            <div class="text-[11px] text-slate-400">Roles Tested</div>
          </div>
          <div class="bg-slate-900/60 p-3.5 rounded-xl border border-white/5">
            <div class="text-2xl font-bold text-cyan-400">${compRounds}</div>
            <div class="text-[11px] text-slate-400">Rounds Documented</div>
          </div>
          <div class="bg-slate-900/60 p-3.5 rounded-xl border border-white/5">
            <div class="text-2xl font-bold text-amber-400">${compTopics.length}</div>
            <div class="text-[11px] text-slate-400">Topics Tagged</div>
          </div>
        </div>
      </div>

      <!-- Experience Cards -->
      <h2 class="text-lg font-bold text-white mb-4">Detailed Experiences (${compExps.length})</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${compExps.map(exp => `
          <article class="glass-card rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 class="text-xl font-bold text-white">${exp.company}</h3>
                  <div class="text-sm font-medium text-emerald-400">${exp.role}</div>
                </div>
                <div class="flex flex-col items-end gap-1.5">
                  ${getStatusBadge(exp.status, exp.rounds)}
                  <span class="text-xs text-slate-500 font-mono">Batch ${exp.year}</span>
                </div>
              </div>

              <div class="flex items-center gap-2 text-xs text-slate-400 mb-5 pb-4 border-b border-white/[0.06]">
                <span>Contributor: @${exp.contributor}</span>
                <span>•</span>
                <span>${exp.rounds.length} Rounds</span>
              </div>

              <div class="space-y-3.5">
                ${exp.rounds.map(r => `
                  <div class="bg-slate-900/70 rounded-xl p-3.5 border border-white/[0.06]">
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <a href="../rounds/${r.typeSlug}.html" class="text-xs font-semibold text-slate-200 hover:text-emerald-400">${r.title}</a>
                      ${getDifficultyBadge(r.difficulty)}
                    </div>
                    <div class="text-xs text-slate-300 leading-relaxed font-sans">
                      ${renderMarkdownToHtml(r.details, '../')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
              <span class="font-mono text-[11px]">${exp.filename}</span>
              <a href="https://github.com/Harshshah1106/MU_INTERVIEWS-/blob/main/experiences/${exp.filename}" target="_blank" class="text-emerald-400 hover:text-emerald-300 font-medium">View Source ↗</a>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
    `;

    const compHtml = renderPageShell({
      title: `${company} Interview Experiences`,
      description: `Real on-campus placement interview questions and round breakdown for ${company} at Marwadi University.`,
      content: companyContent,
      rootPrefix: '../',
      activeNav: 'companies'
    });

    fs.writeFileSync(path.join(COMPANIES_DIR, `${compSlug}.html`), compHtml);
  });
  console.log(`✅ Generated ${taxonomy.companies.length} company pages in /docs/companies/`);

  // -------------------------------------------------------------
  // Generate Round Pages: /docs/rounds/<slug>.html
  // -------------------------------------------------------------
  taxonomy.roundTypes.forEach(roundType => {
    const roundSlug = slugify(roundType);
    
    // Find all matching rounds across experiences
    const matchingEntries = [];
    experiences.forEach(exp => {
      exp.rounds.forEach(r => {
        if (r.canonicalType.toLowerCase() === roundType.toLowerCase() || 
            r.title.toLowerCase().includes(roundType.toLowerCase().replace(' round', ''))) {
          matchingEntries.push({
            experience: exp,
            round: r
          });
        }
      });
    });

    const roundContent = `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <a href="../index.html" class="hover:text-emerald-400 transition-colors">Home</a>
        <span>/</span>
        <span>Rounds</span>
        <span>/</span>
        <span class="text-white font-medium">${roundType}</span>
      </nav>

      <!-- Banner -->
      <div class="glass-panel p-6 sm:p-8 rounded-2xl mb-8">
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-xs font-semibold border border-cyan-800/80 mb-2">
          Interview Stage
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">${roundType}</h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">Cross-company analysis of questions, formats, and difficulty levels. Click any card to view company profile.</p>
        
        <div class="flex items-center gap-6 mt-6 pt-6 border-t border-white/[0.08] text-xs">
          <div><span class="text-white font-bold text-base">${matchingEntries.length}</span> <span class="text-slate-400">Total Occurrences</span></div>
          <div><span class="text-emerald-400 font-bold text-base">${[...new Set(matchingEntries.map(m => m.experience.company))].length}</span> <span class="text-slate-400">Companies</span></div>
        </div>
      </div>

      <!-- Excerpts list -->
      <h2 class="text-lg font-bold text-white mb-4">Round Occurrences (${matchingEntries.length})</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${matchingEntries.map(item => `
          <div class="glass-card rounded-2xl p-5 flex flex-col justify-between cursor-pointer group hover:border-emerald-500/40"
               onclick="if (!event.target.closest('a') && !event.target.closest('button')) window.location.href='../companies/${item.experience.companySlug}.html'">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div>
                  <a href="../companies/${item.experience.companySlug}.html" class="text-base font-bold text-white group-hover:text-emerald-400 transition-colors inline-flex items-center gap-1">
                    <span>${item.experience.company}</span>
                    <svg class="w-3.5 h-3.5 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                  </a>
                  <div class="text-xs text-emerald-400 font-medium">${item.experience.role}</div>
                </div>
                ${getDifficultyBadge(item.round.difficulty)}
              </div>

              <div class="bg-slate-900/80 rounded-xl p-3.5 border border-white/5 text-xs text-slate-300 leading-relaxed">
                ${renderMarkdownToHtml(item.round.details, '../')}
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
              <span>Contributor: @${item.experience.contributor}</span>
              <a href="../companies/${item.experience.companySlug}.html" class="text-emerald-400 hover:text-emerald-300 font-medium">Company Profile →</a>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    `;

    const roundHtml = renderPageShell({
      title: `${roundType} Questions & Insights`,
      description: `Analysis and past questions for ${roundType} across campus recruiters at Marwadi University.`,
      content: roundContent,
      rootPrefix: '../',
      activeNav: 'rounds'
    });

    fs.writeFileSync(path.join(ROUNDS_DIR, `${roundSlug}.html`), roundHtml);
  });
  console.log(`✅ Generated ${taxonomy.roundTypes.length} round pages in /docs/rounds/`);

  // -------------------------------------------------------------
  // Generate Topic Pages: /docs/topics/<slug>.html
  // -------------------------------------------------------------
  taxonomy.topics.forEach(topic => {
    const topicSlug = slugify(topic);
    
    // Find all experiences and rounds covering this topic
    const topicOccurrences = [];
    experiences.forEach(exp => {
      exp.rounds.forEach(r => {
        if (r.topics.includes(topic)) {
          topicOccurrences.push({
            experience: exp,
            round: r
          });
        }
      });
    });

    const companiesAsking = [...new Set(topicOccurrences.map(o => o.experience.company))];
    const companyCountMap = {};
    companiesAsking.forEach(c => {
      companyCountMap[c] = topicOccurrences.filter(o => o.experience.company === c).length;
    });

    const topicContent = `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <a href="../index.html" class="hover:text-emerald-400 transition-colors">Home</a>
        <span>/</span>
        <span>Topics</span>
        <span>/</span>
        <span class="text-white font-medium">#${topic}</span>
      </nav>

      <!-- Banner -->
      <div class="glass-panel p-6 sm:p-8 rounded-2xl mb-8">
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 text-xs font-semibold border border-amber-800/80 mb-2 font-mono">
          #${topic}
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Topic: ${topic.replace(/-/g, ' ')}</h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">Companies asking about this topic during on-campus recruitment. Click any card to view company blueprint.</p>

        <!-- Topic Bar Chart -->
        <div class="mt-6 pt-6 border-t border-white/[0.08]">
          <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Companies That Tested This Topic</h3>
          <div class="relative h-56 sm:h-64 w-full">
            <canvas id="topicCompanyChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Question and Round Occurrences -->
      <h2 class="text-lg font-bold text-white mb-4">Questions & Round References (${topicOccurrences.length})</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${topicOccurrences.map(item => `
          <div class="glass-card rounded-2xl p-5 flex flex-col justify-between cursor-pointer group hover:border-emerald-500/40"
               onclick="if (!event.target.closest('a') && !event.target.closest('button')) window.location.href='../companies/${item.experience.companySlug}.html'">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div>
                  <a href="../companies/${item.experience.companySlug}.html" class="text-base font-bold text-white group-hover:text-emerald-400 transition-colors inline-flex items-center gap-1">
                    <span>${item.experience.company}</span>
                    <svg class="w-3.5 h-3.5 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                  </a>
                  <div class="text-xs text-emerald-400 font-medium">${item.round.title}</div>
                </div>
                ${getDifficultyBadge(item.round.difficulty)}
              </div>

              <div class="bg-slate-900/80 rounded-xl p-3.5 border border-white/5 text-xs text-slate-300 leading-relaxed">
                ${renderMarkdownToHtml(item.round.details, '../')}
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
              <span>Contributor: @${item.experience.contributor}</span>
              <a href="../companies/${item.experience.companySlug}.html" class="text-emerald-400 hover:text-emerald-300 font-medium">Company Profile →</a>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const ctx = document.getElementById('topicCompanyChart');
        if (ctx) {
          const compData = ${JSON.stringify(companyCountMap)};
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: Object.keys(compData).length ? Object.keys(compData) : ['None yet'],
              datasets: [{
                label: 'Questions Asked',
                data: Object.values(compData).length ? Object.values(compData) : [0],
                backgroundColor: 'rgba(245, 158, 11, 0.75)',
                borderColor: '#f59e0b',
                borderWidth: 1,
                borderRadius: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8', stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
              }
            }
          });
        }
      });
    </script>
    `;

    const topicHtml = renderPageShell({
      title: `${topic} Interview Questions`,
      description: `Campus interview questions on ${topic} at Marwadi University.`,
      content: topicContent,
      rootPrefix: '../',
      activeNav: 'topics'
    });

    fs.writeFileSync(path.join(TOPICS_DIR, `${topicSlug}.html`), topicHtml);
  });
  console.log(`✅ Generated ${taxonomy.topics.length} topic pages in /docs/topics/`);
  console.log('🎉 Phase 3 Static Site Generation Complete!');
}

build();
