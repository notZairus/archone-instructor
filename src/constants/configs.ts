export const DEFAULT_PAGE_SIZE = 10;

export const FILE_TYPES = {
  js: "JavaScript",
  py: "Python",
  cs: "C#",
};

export const TYPE_DISPLAY_ORDER = ["warning", "improvement", "info"];

export const ISSUE_PRINCIPLE_BY_TITLE = {
  "Unused Variable": "YAGNI (You Aren't Gonna Need It)",
  "Unused Function": "YAGNI (You Aren't Gonna Need It)",
  "Use of var": "KISS (Keep It Simple, Student)",
  "Poor Variable Naming": "KISS (Keep It Simple, Student)",
  "Naming Convention": "KISS (Keep It Simple, Student)",
  "Name Reuse": "DRY (Don't Repeat Yourself)",
  "Function Too Long": "Single Responsibility Principle",
  "Too Many Parameters": "KISS (Keep It Simple, Student)",
  "High Complexity": "Separation of Concerns",
  "Duplicate Code Blocks": "DRY (Don't Repeat Yourself)",
  "Deep Nesting": "KISS (Keep It Simple, Student)",
  "TODO Comment": "N/A",
  "Commented-out Code": "YAGNI (You Aren't Gonna Need It)",
  "Mixed Language Syntax": "KISS (Keep It Simple, Student)",

  // OOP mode
  "No Constructor": "KISS (Keep It Simple, Student)",
  "Too Many Dependencies": "Separation of Concerns",
  "Method Too Long": "Single Responsibility Principle",
  "Large Class / God Class": "Single Responsibility Principle",
  "Hardcoded Values": "KISS (Keep It Simple, Student)",
  "Too Many Public Methods": "Separation of Concerns",
  "Duplicate Methods": "DRY (Don't Repeat Yourself)",
};

export const ADVICE_BY_ISSUE_TITLE = {
  "Unused Variable":
    "Remove unused variables or use them in the intended logic.",
  "Unused Function":
    "Delete unused functions or connect them to real behavior.",
  "Poor Variable Naming": "Use clearer, intention-revealing variable names.",
  "Naming Convention": "Apply one naming style consistently across your code.",
  "Use of var": "Replace 'var' with 'const' or 'let'.",
  "Name Reuse": "Give each value a distinct name within the same scope.",
  "Duplicate Code Blocks":
    "Extract repeated logic into a shared helper to avoid duplication.",
  "Function Too Long":
    "Break long functions into smaller helpers with one responsibility.",
  "Too Many Parameters":
    "Group related inputs into a single object or structure.",
  "High Complexity":
    "Simplify branching logic by splitting it into smaller helpers.",
  "Deep Nesting":
    "Refactor nested logic with early returns or helper functions.",
  "TODO Comment":
    "Convert TODO comments into tracked tasks and resolve them regularly.",
  "Commented-out Code":
    "Remove dead commented code to keep files clean and maintainable.",
  "No Constructor": "Initialize fields with a constructor or initializer.",
  "Too Many Dependencies":
    "Reduce coupling by splitting responsibilities into smaller modules.",
  "Method Too Long": "Split long methods into focused helper methods.",
  "Large Class / God Class":
    "Break large classes into smaller classes by responsibility.",
  "Hardcoded Values":
    "Replace magic values with named constants or configuration.",
  "Too Many Public Methods":
    "Keep the public API minimal and hide implementation details.",
  "Duplicate Methods":
    "Extract shared method logic into one helper and reuse it.",
};

export const VIDEO_LINK_BY_ISSUE_TITLE = {
  "Unused Variable":
    "https://www.youtube.com/results?search_query=unused+variable",

  "Unused Function":
    "https://www.youtube.com/results?search_query=unused+function",

  "Poor Variable Naming":
    "https://www.youtube.com/results?search_query=poor+variable+naming",

  "Naming Convention":
    "https://www.youtube.com/results?search_query=programming+naming+conventions",

  "Use of var":
    "https://www.youtube.com/results?search_query=javascript+var+vs+let+const",

  "Name Reuse":
    "https://www.youtube.com/results?search_query=programming+variable+name+reuse",

  "Duplicate Code Blocks":
    "https://www.youtube.com/results?search_query=duplicate+code+refactoring",

  "Function Too Long":
    "https://www.youtube.com/results?search_query=long+function+code+smell+refactoring",

  "Too Many Parameters":
    "https://www.youtube.com/results?search_query=too+many+parameters+code+smell",

  "High Complexity":
    "https://www.youtube.com/results?search_query=cyclomatic+complexity+code",

  "Deep Nesting":
    "https://www.youtube.com/results?search_query=deeply+nested+code+refactoring",

  "TODO Comment":
    "https://www.youtube.com/results?search_query=TODO+comments+code+smell",

  "Commented-out Code":
    "https://www.youtube.com/results?search_query=commented+out+code+code+smell",

  "No Constructor":
    "https://www.youtube.com/results?search_query=javascript+class+constructor+best+practices",

  "Too Many Dependencies":
    "https://www.youtube.com/results?search_query=too+many+dependencies+code+smell",

  "Method Too Long":
    "https://www.youtube.com/results?search_query=long+method+code+smell+refactoring",

  "Large Class / God Class":
    "https://www.youtube.com/results?search_query=god+class+code+smell+refactoring",

  "Hardcoded Values":
    "https://www.youtube.com/results?search_query=hardcoded+values+code+smell",

  "Too Many Public Methods":
    "https://www.youtube.com/results?search_query=too+many+public+methods+code+smell",

  "Duplicate Methods":
    "https://www.youtube.com/results?search_query=duplicate+methods+code+smell+refactoring",
};

export const DEFAULT_PENALTY_BY_TYPE: Record<string, number> = {
  warning: 10,
  improvement: 5,
  info: 2.5,
};

export const DEFAULT_FALLBACK_PENALTY = 5;

export const COMPLEXITY_CLASSES = [
  {
    rank: 1,
    name: "Constant",
    notation: "O(1)",
    description:
      "No loops, recognized iteration methods, or recursion are found.",
  },
  {
    rank: 2,
    name: "Linear",
    notation: "O(n)",
    description: "One loop or one simple recursive call.",
  },
  {
    rank: 3,
    name: "Linearithmic",
    notation: "O(n log n)",
    description: "Recognized sorting operations.",
    examples: {
      JavaScript: [".sort()"],
      Python: ["sort()", "sorted()"],
      "C#": ["OrderBy()", "OrderByDescending()"],
    },
  },
  {
    rank: 4,
    name: "Polynomial",
    notation: "O(n^k)",
    description: "Based on the maximum nested-loop depth.",
    examples: {
      "One nested loop": "O(n^2)",
      "Three nested loops": "O(n^3)",
    },
  },
  {
    rank: 5,
    name: "Exponential",
    notation: "O(2^n)",
    description:
      "Multiple recursive calls when no obvious divide-and-conquer work is detected.",
  },
];
