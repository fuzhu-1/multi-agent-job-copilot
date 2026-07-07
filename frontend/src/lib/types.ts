/* 后端 API 响应类型 */

export interface ResumeUploadResponse {
  filename: string;
  text: string;
}

export interface AnalyzeResumeResponse {
  skills: string[];
  education: {
    school: string;
    degree: string;
    major: string;
    duration: string;
  } | null;
  experience: {
    company: string;
    position: string;
    duration: string;
    description: string[];
  }[];
  projects: {
    name: string;
    role: string;
    description: string[];
    tech_stack: string[];
  }[];
  summary: string;
}

export interface MatchJobResponse {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  suggestions: string[];
  analysis: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: ChatMessage[];
}
