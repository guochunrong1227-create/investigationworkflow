export interface User {
  id: string;
  name: string;
  role: "admin" | "consultant";
  email: string;
  companyId: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface SystemSettings {
  defaultModel: string;
  aiProvider: string;
  systemName: string;
  exportFormat: "md" | "pdf";
  globalApiKeys?: {
    deepseek: string;
    gemini: string;
    doubao: string;
  };
  userApiKeys?: Record<string, Record<string, string>>;
  userNotifications?: Record<string, {
    emails: string[];
    dingtalkWebhook: string;
    feishuWebhook: string;
    smtp?: {
      host: string;
      port: number;
      user: string;
      pass: string;
      from: string;
    }
  }>;
  // notifications?: {
  //   emails: string[];
  //   dingtalkWebhook: string;
  //   feishuWebhook: string;
  //   smtp?: {
  //     host: string;
  //     port: number;
  //     user: string;
  //     pass: string;
  //     from: string;
  //   }
  // };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  userId: string;
  companyId: string;
  lastStep: number;
  createdAt: string;
  updatedAt: string;
}
