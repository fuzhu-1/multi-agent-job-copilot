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

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
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

  // 保存会话列表
  const saveSessions = (list: SessionInfo[]) => {
    setSessions(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // 新建对话
  const handleNewChat = () => {
    setSessionId("");
    setMessages([]);
    setStreamingText("");
    if (abortRef.current) abortRef.current();
  };

  // 切换会话
  const handleSelectSession = async (id: string) => {
    if (abortRef.current) abortRef.current();
    setSessionId(id);
    setStreamingText("");
    const history = await getChatHistory(id);
    setMessages(history);
  };

  // 发送消息
  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;

    const sid = sessionId || `session_${Date.now().toString(36)}`;
    if (!sessionId) {
      setSessionId(sid);
      saveSessions([
        { id: sid, preview: text.slice(0, 30) },
        ...sessions,
      ]);
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
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: finalText },
          ]);
        }
        setStreamingText("");
        setIsLoading(false);
      },
      onError: (err) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `错误: ${err}` },
        ]);
        setStreamingText("");
        setIsLoading(false);
      },
    });

    abortRef.current = stream.abort;
  };

  // 上传并分析简历
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
      { role: "assistant", content: "正在解析简历..." },
    ]);

    try {
      const uploadResult = await uploadResume(file);
      const analysis = await analyzeResume(uploadResult.text);

      const skills = analysis.skills?.join("、") || "未识别";
      const expCount = analysis.experience?.length || 0;
      const edu = analysis.education
        ? `${analysis.education.school} ${analysis.education.degree}`
        : "未识别";

      setMessages((prev) => {
        const withoutStatus = prev.slice(0, -1);
        return [
          ...withoutStatus,
          {
            role: "assistant",
            content: `✅ 简历分析完成

**技能**: ${skills}
**教育**: ${edu}
**经历**: ${expCount} 段
**简介**: ${analysis.summary || ""}

你可以继续提问，例如：
- "帮我匹配这个岗位..."
- "针对这份简历准备面试题"
- "我有这些技能，适合投什么岗位？"`,
          },
        ];
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "处理失败";
      setMessages((prev) => {
        const withoutError = prev.slice(0, -1);
        return [
          ...withoutError,
          { role: "assistant", content: `❌ ${msg}` },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allMessages = [
    ...messages,
    ...(streamingText
      ? [{ role: "assistant" as const, content: streamingText }]
      : []),
  ];

  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <Sidebar
        sessions={sessions}
        currentSessionId={sessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
      />

      {/* 主聊天区 */}
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
          <h1 className="text-lg font-semibold">Agentic Career Copilot</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            AI 驱动的智能求职助手
          </p>
        </header>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {allMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] space-y-3">
              <div className="text-5xl">🤖</div>
              <p className="text-lg font-medium">你好！我是你的求职助手</p>
              <p className="text-sm max-w-md text-center">
                我可以帮你分析简历、解析岗位描述、计算匹配度或准备面试题。
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  "帮我分析这份简历",
                  "看看这个岗位要求",
                  "这个岗位和我匹配吗？",
                  "帮我准备面试题",
                ].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => handleSend(hint)}
                    className="px-3 py-1.5 text-sm rounded-full border border-[var(--color-border)] hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] transition-colors"
                  >
                    {hint}
                  </button>
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
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <ChatInput
          onSend={handleSend}
          onFileUpload={handleFileUpload}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
