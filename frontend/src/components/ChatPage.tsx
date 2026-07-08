"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { streamChat, getChatHistory, uploadResume, analyzeResume } from "@/lib/api";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

const STORAGE_KEY = "career_copilot_sessions";

interface SessionInfo {
  id: string;
  preview: string;
}

// 加载提示输入
const LOADING_PHRASES = [
  "思考中",
  "分析上下文",
  "查知识库",
  "生成回答",
];

function LoadingDots() {
  const [dotCount, setDotCount] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDotCount((c) => (c + 1) % 4);
    }, 400);
    const phraseInterval = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 2000);
    return () => {
      clearInterval(dotInterval);
      clearInterval(phraseInterval);
    };
  }, []);

  return (
    <div className="glass rounded-[var(--radius-lg)] rounded-bl-[4px] px-5 py-3.5 inline-flex items-center gap-3">
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
          style={{ animation: `dotPulse 1.2s ${0 * 0.2}s infinite` }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
          style={{ animation: `dotPulse 1.2s ${1 * 0.2}s infinite` }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
          style={{ animation: `dotPulse 1.2s ${2 * 0.2}s infinite` }}
        />
      </div>
      <span className="text-xs text-[var(--color-text-muted)] font-medium tracking-wide">
        {LOADING_PHRASES[phraseIdx]}
      </span>
    </div>
  );
}

// 快捷按钮组
const QUICK_ACTIONS = [
  { label: "帮我分析这份简历", icon: "📄" },
  { label: "看看这个岗位要求", icon: "📋" },
  { label: "这个岗位和我匹配吗？", icon: "📊" },
  { label: "帮我准备面试题", icon: "🎯" },
];

// 技能卡片
const SKILLS = [
  { label: "简历分析", desc: "智能解析 PDF 简历" },
  { label: "岗位匹配", desc: "基于 RAG 的匹配引擎" },
  { label: "面试准备", desc: "针对性面试题生成" },
  { label: "实时流式", desc: "SSE 流式对话响应" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const streamingTextRef = useRef("");

  // 加载会话列表
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, []);

  const saveSessions = (list: SessionInfo[]) => {
    setSessions(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleNewChat = () => {
    setSessionId("");
    setMessages([]);
    setStreamingText("");
    if (abortRef.current) abortRef.current();
  };

  const handleSelectSession = async (id: string) => {
    if (abortRef.current) abortRef.current();
    setSessionId(id);
    setStreamingText("");
    const history = await getChatHistory(id);
    setMessages(history);
  };

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;

    const sid = sessionId || `session_${Date.now().toString(36)}`;
    if (!sessionId) {
      setSessionId(sid);
      saveSessions([{ id: sid, preview: text.slice(0, 30) }, ...sessions]);
    }

    const userMsg: ChatMessageType = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreamingText("");
    setIsLoading(true);
    streamingTextRef.current = "";

    const stream = streamChat(text, sid, {
      onToken: (token) => {
        streamingTextRef.current += token;
        setStreamingText(streamingTextRef.current);
      },
      onDone: () => {
        const finalText = streamingTextRef.current;
        if (finalText) {
          setMessages((prev) => [...prev, { role: "assistant", content: finalText }]);
        }
        setStreamingText("");
        setIsLoading(false);
      },
      onError: (err) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `❌ ${err}` },
        ]);
        setStreamingText("");
        setIsLoading(false);
      },
    });

    abortRef.current = stream.abort;
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "请上传 PDF 格式的简历文件。" },
      ]);
      return;
    }

    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `📎 上传简历: ${file.name}` },
    ]);

    try {
      const uploadResult = await uploadResume(file);
      const analysis = await analyzeResume(uploadResult.text);

      const skills = analysis.skills?.join("、") || "未识别";
      const expCount = analysis.experience?.length || 0;

      let edu = "未识别";
      if (analysis.education) {
        const e = analysis.education;
        edu = `${e.school} · ${e.degree}${e.major ? ` · ${e.major}` : ""}`;
      }

      const content = `✅ **简历分析完成**

**技能专长** — ${skills}
**教育背景** — ${edu}
**工作经历** — ${expCount} 段
**个人简介** — ${analysis.summary || ""}

---

接下来你可以：
- 粘贴一份 **岗位描述 (JD)**，让我做匹配分析
- 输入 **"帮我准备面试"**，我出题给你练
- 继续对话深入探讨`;

      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "处理失败";
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const allMessages = [
    ...messages,
    ...(streamingText ? [{ role: "assistant" as const, content: streamingText }] : []),
  ];

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar
        sessions={sessions}
        currentSessionId={sessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
      />

      {/* 主区 */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* 头部 */}
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 backdrop-blur-xl px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div>
              <h1
                className="text-xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Agentic Career Copilot
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] tracking-wide">
                AI 驱动的智能求职指挥中心
              </p>
            </div>
            {sessionId && (
              <span className="text-[10px] text-[var(--color-text-muted)] font-mono bg-[var(--color-surface)] px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--color-border)]">
                {sessionId.slice(0, 10)}
              </span>
            )}
          </div>
        </header>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {allMessages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-fade-in">
                {/* 品牌展示 */}
                <div className="mb-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] flex items-center justify-center text-2xl text-[var(--color-user-text)] font-bold shadow-[0_0_40px_rgba(212,168,83,0.15)]"
                    style={{ fontFamily: "var(--font-playfair)" }}>
                    CC
                  </div>
                  <h2
                    className="text-2xl font-semibold text-[var(--color-text)] mb-2"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    你的求职指挥中心
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
                    上传简历、分析岗位、计算匹配度、准备面试题 —— 全流程 AI 驱动
                  </p>
                </div>

                {/* 快捷操作 */}
                <div className="flex flex-wrap justify-center gap-2 mb-10">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.label)}
                      className="group flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-subtle)] transition-all duration-200"
                    >
                      <span className="text-sm">{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>

                {/* 功能卡片 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
                  {SKILLS.map((s, i) => (
                    <div
                      key={s.label}
                      className="glass rounded-[var(--radius-md)] px-3 py-3 text-center animate-slide-up"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <p className="text-xs font-medium text-[var(--color-text)] mb-0.5">{s.label}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allMessages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                isStreaming={i === allMessages.length - 1 && streamingText !== ""}
              />
            ))}

            {isLoading && !streamingText && (
              <div className="flex justify-start msg-enter">
                <LoadingDots />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区 */}
        <ChatInput onSend={handleSend} onFileUpload={handleFileUpload} disabled={isLoading} />

        {/* 底部装饰发光 */}
        <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none z-0"
          style={{
            background: "linear-gradient(to top, rgba(212,168,83,0.04) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
