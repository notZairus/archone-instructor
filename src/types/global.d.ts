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
