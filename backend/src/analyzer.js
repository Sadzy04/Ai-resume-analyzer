const SKILL_CATEGORIES = {
  ai_ml: [
    "ai",
    "machinelearning",
    "deeplearning",
    "datascience",
    "analytics",
    "tensorflow",
    "pytorch",
    "scikit",
    "numpy",
    "pandas",
    "generativeai",
  ],
  programming: [
    "python",
    "java",
    "javascript",
    "typescript",
    "c",
    "c++",
    "go",
  ],
  frontend: [
    "react",
    "angular",
    "vue",
    "html",
    "css",
    "bootstrap",
    "tailwind",
  ],
  backend: [
    "node",
    "express",
    "django",
    "flask",
    "spring",
    "springboot",
    "api",
    "rest",
    "graphql",
    "microservices",
  ],
  database: [
    "mysql",
    "postgresql",
    "mongodb",
    "redis",
    "oracle",
    "sql",
  ],
  cloud_devops: [
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "jenkins",
    "terraform",
    "linux",
    "git",
    "github",
    "gitlab",
  ],
  bigdata: [
    "spark",
    "hadoop",
    "kafka",
    "bigdata",
    "distributedcomputing",
  ],
  security: [
    "cybersecurity",
    "networksecurity",
    "cryptography",
    "penetrationtesting",
    "ethicalhacking",
  ],
};

const SYNONYMS = {
  javascript: ["js"],
  machinelearning: ["ml", "machine learning"],
  deeplearning: ["deep learning"],
  datascience: ["data science"],
  bigdata: ["big data"],
  node: ["nodejs", "node.js"],
  react: ["reactjs", "react.js"],
  ai: ["artificial intelligence"],
  generativeai: ["gen ai", "genai", "generative ai"],
  distributedcomputing: ["distributed computing"],
  api: ["apis"],
  sql: ["mysql", "postgresql", "oracle"],
};

const CATEGORY_WEIGHTS = {
  ai_ml: 1.5,
  programming: 1.4,
  frontend: 1.1,
  backend: 1.2,
  database: 1.2,
  cloud_devops: 1.1,
  bigdata: 1.3,
  security: 1.0,
};

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/machine learning/g, "machinelearning")
    .replace(/deep learning/g, "deeplearning")
    .replace(/data science/g, "datascience")
    .replace(/big data/g, "bigdata")
    .replace(/artificial intelligence/g, "ai")
    .replace(/generative ai/g, "generativeai")
    .replace(/distributed computing/g, "distributedcomputing")
    .replace(/node\.js/g, "node")
    .replace(/nodejs/g, "node")
    .replace(/react\.js/g, "react")
    .replace(/reactjs/g, "react")
    .replace(/c\/c\+\+/g, "c c++")
    .replace(/[^\w+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAllSkills() {
  return Object.values(SKILL_CATEGORIES).flat();
}

function detectSkills(text) {
  const cleaned = normalize(text);
  const found = new Set();

  const allSkills = getAllSkills();

  allSkills.forEach((skill) => {
    if (cleaned.includes(skill)) {
      found.add(skill);
    }
  });

  Object.entries(SYNONYMS).forEach(([skill, alts]) => {
    alts.forEach((alt) => {
      if (cleaned.includes(alt)) {
        found.add(skill);
      }
    });
  });

  return [...found];
}

function getSkillCategory(skill) {
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.includes(skill)) {
      return category;
    }
  }
  return null;
}

function calculateWeightedScore(jdSkills, matchedSkills) {
  let totalWeight = 0;
  let matchedWeight = 0;

  jdSkills.forEach((skill) => {
    const category = getSkillCategory(skill);
    const weight = CATEGORY_WEIGHTS[category] || 1;
    totalWeight += weight;

    if (matchedSkills.includes(skill)) {
      matchedWeight += weight;
    }
  });

  if (totalWeight === 0) return 0;
  return Math.round((matchedWeight / totalWeight) * 100);
}

function calculateCategoryBreakdown(jdSkills, matchedSkills) {
  const breakdown = {};

  Object.keys(SKILL_CATEGORIES).forEach((category) => {
    const categorySkillsInJD = jdSkills.filter(
      (skill) => getSkillCategory(skill) === category
    );

    if (categorySkillsInJD.length === 0) {
      return;
    }

    const categoryMatched = categorySkillsInJD.filter((skill) =>
      matchedSkills.includes(skill)
    );

    const score = Math.round(
      (categoryMatched.length / categorySkillsInJD.length) * 100
    );

    breakdown[category] = {
      score,
      totalSkills: categorySkillsInJD.length,
      matchedSkills: categoryMatched,
      missingSkills: categorySkillsInJD.filter(
        (skill) => !categoryMatched.includes(skill)
      ),
    };
  });

  return breakdown;
}

function buildSuggestions(missingSkills, resumeSkills, jdSkills, categoryBreakdown) {
  const suggestions = [];

  if (missingSkills.length > 0) {
    suggestions.push(
      `Consider adding these relevant skills or keywords where truthful: ${missingSkills
        .slice(0, 8)
        .join(", ")}.`
    );
  }

  const weakCategories = Object.entries(categoryBreakdown)
    .filter(([, value]) => value.score < 50)
    .map(([key]) => key);

  if (weakCategories.length > 0) {
    suggestions.push(
      `Your profile appears weaker in these categories for this role: ${weakCategories.join(
        ", "
      )}. Strengthen related projects, coursework, or tools if applicable.`
    );
  }

  if (!resumeSkills.includes("sql") && jdSkills.includes("sql")) {
    suggestions.push("Highlight SQL/database work more clearly in your skills or projects section.");
  }

  if (
    jdSkills.some((s) => ["react", "angular", "vue"].includes(s)) &&
    !resumeSkills.some((s) => ["react", "angular", "vue"].includes(s))
  ) {
    suggestions.push("Add frontend framework exposure if you have relevant coursework or project experience.");
  }

  if (
    jdSkills.some((s) => ["tensorflow", "pytorch", "scikit"].includes(s)) &&
    !resumeSkills.some((s) => ["tensorflow", "pytorch", "scikit"].includes(s))
  ) {
    suggestions.push("Mention specific ML libraries used in coursework, labs, or projects.");
  }

  suggestions.push("Include measurable achievements such as percentages, outcomes, or project impact.");
  suggestions.push("Keep a dedicated technical skills section for better ATS readability.");

  return suggestions;
}

export default function analyze(resumeText, jdText) {
  const resumeSkills = detectSkills(resumeText);
  const jdSkills = detectSkills(jdText);

  const resumeSet = new Set(resumeSkills);

  const matchedKeywords = [];
  const missingKeywords = [];

  jdSkills.forEach((skill) => {
    if (resumeSet.has(skill)) {
      matchedKeywords.push(skill);
    } else {
      missingKeywords.push(skill);
    }
  });

  let score = calculateWeightedScore(jdSkills, matchedKeywords);
  score += Math.min(resumeSkills.length, 10);
  if (score > 100) score = 100;

  const categoryBreakdown = calculateCategoryBreakdown(jdSkills, matchedKeywords);

  const suggestions = buildSuggestions(
    missingKeywords,
    resumeSkills,
    jdSkills,
    categoryBreakdown
  );

  return {
    score,
    matchedKeywords,
    missingKeywords,
    suggestions,
    resumeSkills,
    jdSkills,
    categoryBreakdown,
  };
}