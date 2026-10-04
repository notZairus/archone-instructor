type Timestamps = {
  $createdAt?: string;
  $updatedAt?: string;
};

export interface User extends Timestamps {
  $id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Classroom extends Timestamps {
  $id: string;
  name: string;
  description: string;
  code: string;
}

export interface Student extends User, Timestamps {
  accepted: boolean;
}

export interface Issue extends Timestamps {
  id?: string;
  title?: string;
  code?: string;
  type?: string;
  line?: number;
  message?: string;
  suggestion?: string;
  why?: string;
  functionName?: string;
  functionLines?: string;
  advice?: string;
  principle?: string;
}

export interface Analysis extends Timestamps {
  $id: string;
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  code: string;
  mode: string;
  createdAt: string;
  updatedAt?: string;
  comments?: Array<{ id?: string; line?: number; text?: string }>;
  functions?: Array<{
    id?: string;
    name?: string;
    complexity?: number;
    maxNesting?: number;
    lines?: number;
    line?: number;
  }>;
  variables?: Array<{ id?: string; name?: string; line?: number }>;
  issues?: AnalysisIssue[];
}

export interface Feedback extends Timestamps {
  $id: string;
  analysisId: string;
  fileName: string;
  instructorId: string;
  studentId: string;
  message: string;
  highlightedCode: string;
}

export interface Complexity extends Timestamps {
  $id: string;
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  code: string;
  mode: string;
  createdAt: string;
  updatedAt?: string;
  complexitySummary: {
    functions: ComplexityFunction[];
  };
}

export interface ComplexityFunction extends Timestamps {
  name: string;
  code: string;
  line: number;
  space: {
    estimate: string;
    class: string;
  } | null;
  time: {
    estimate: string;
    class: string;
  } | null;
}

export interface ClassroomFolder {
  id: string;
  name: string;
  description: string;
  targetFileNamePrefix: string;
  analyses?: Analysis[];
  submissions?: any[];
  updatedAt: string;
  classroom?: Classroom;
}

declare module "string-similarity" {
  export function compareTwoStrings(first: string, second: string): number;
}
