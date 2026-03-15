export interface Company {
  id: string;
  name: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  role: "admin" | "user";
  email: string;
  apiKeys?: {
    deepseek?: string;
    gemini?: string;
    doubao?: string;
  };
}

export interface WorkflowStep {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  inputFiles: string[];
  aiAnalysis?: string;
}

export interface Project {
  id: string;
  name: string;
  companyId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastStep: number;
  description?: string;
  steps: WorkflowStep[];
}

export interface SystemSettings {
  defaultModel: string;
  aiProvider: string;
  systemName: string;
  exportFormat: "md" | "pdf";
  userApiKeys?: {
    [userId: string]: {
      deepseek?: string;
      gemini?: string;
      doubao?: string;
    }
  };
}
