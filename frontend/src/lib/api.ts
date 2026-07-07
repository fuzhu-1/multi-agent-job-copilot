/**
 * API 客户端 — 所有后端调用封装
 */
import type {
  ResumeUploadResponse,
  AnalyzeResumeResponse,
  MatchJobResponse,
  ChatMessage,
} from "./types";

const API_BASE = "/api";

// ── 简历相关 ─────────────────────────────────────────────

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload_resume`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "上传失败" }));
    throw new Error(err.detail || "上传失败");
  }
  return res.json();
}

export async function analyzeResume(
  text: string
): Promise<AnalyzeResumeResponse> {
  const res = await fetch(`${API_BASE}/analyze_resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "分析失败" }));
    throw new Error(err.detail || "分析失败");
  }
  return res.json();
}

export async function matchJob(
  resumeText: string,
  jdText: string
): Promise<MatchJobResponse> {
  const res = await fetch(`${API_BASE}/match_job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_text: resumeText,
      job_description: jdText,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "匹配失败" }));
    throw new Error(err.detail || "匹配失败");
  }
  return res.json();
}

// ── 聊天相关 ─────────────────────────────────────────────

export async function getChatHistory(
  sessionId: string
): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/chat/history?session_id=${sessionId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages || [];
}

/**
 * SSE 流式聊天
 * 返回 { abort } 控制器，可中途取消
 */
export function streamChat(
  message: string,
  sessionId: string | undefined,
  callbacks: {
    onToken: (token: string) => void;
    onDone: (agent?: string) => void;
    onError: (err: string) => void;
  }
): { abort: () => void } {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: sessionId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        callbacks.onError("请求失败，请稍后重试");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError("无法读取响应流");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: token")) {
            // 下一行是 data: {...}
            continue;
          }
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                callbacks.onToken(data.content);
              }
            } catch {
              // 忽略非 JSON data 行
            }
          }
          if (line.startsWith("event: done")) {
            callbacks.onDone();
          }
          if (line.startsWith("event: error")) {
            callbacks.onError("处理失败，请稍后重试");
          }
        }
      }
      callbacks.onDone();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      callbacks.onError("网络错误，请检查连接");
    }
  })();

  return { abort: () => controller.abort() };
}
