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

export const DEFAULT_PENALTY_BY_TYPE: Record<string, number> = {
  warning: 10,
  improvement: 5,
  info: 2.5,
};

export const DEFAULT_FALLBACK_PENALTY = 5;
