"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfigProvider, message as antMessage } from "antd";
import zhCN from "antd/locale/zh_CN";
import Sidebar from "@/components/Sidebar";
import MessageBubble from "@/components/MessageBubble";
import ChatInput from "@/components/ChatInput";
import {
  ChatMessage,
  SessionInfo,
  deleteSession as apiDelete,
  getMessages,
  listSessions,
  renameSession as apiRename,
  streamChat,
} from "@/lib/api";

const SUGGESTIONS = [
  "2 型糖尿病患者日常血糖管理有哪些建议？",
  "糖尿病并发症有哪些早期信号？",
  "高血压和糖尿病并存时用药要注意什么？",
  "介绍一下二甲双胍的作用与常见副作用",
];

export default function Home() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list);
    } catch {
      /* 后端未启动时静默 */
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = async (id: string) => {
    setActiveId(id);
    activeIdRef.current = id;
    try {
      const msgs = await getMessages(id);
      setMessages(msgs);
    } catch {
      antMessage.error("加载消息失败");
    }
  };

  const newChat = () => {
    setActiveId(null);
    activeIdRef.current = null;
    setMessages([]);
    setInput("");
  };

  const doSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: text },
      { id: `a-${Date.now()}`, role: "assistant", content: "", streaming: true, citations: [], thinking: "" },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChat(
      { session_id: activeIdRef.current, message: text, deep_think: deepThink },
      {
        onSession: (sessionId, _title) => {
          activeIdRef.current = sessionId;
          setActiveId(sessionId);
          refreshSessions();
        },
        onToken: (t) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + t };
            return next;
          });
        },
        onThinking: (t) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, thinking: (last.thinking ?? "") + t };
            return next;
          });
        },
        onCitations: (cites) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, citations: cites };
            return next;
          });
        },
        onDone: () => {},
        onError: (msg) => {
          antMessage.error(msg);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (!last.content) next[next.length - 1] = { ...last, content: `_生成失败：${msg}_` };
            return next;
          });
        },
      },
      controller.signal
    ).catch((e: Error) => {
      if (e.name !== "AbortError") antMessage.error(`连接中断: ${e.message}`);
    });

    setStreaming(false);
    abortRef.current = null;
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, streaming: false };
      return next;
    });
    refreshSessions();
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const handleRename = async (id: string, title: string) => {
    try {
      await apiRename(id, title);
      await refreshSessions();
    } catch {
      antMessage.error("重命名失败");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(id);
      if (activeIdRef.current === id) newChat();
      await refreshSessions();
    } catch {
      antMessage.error("删除失败");
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: { colorPrimary: "#4d6bfe", borderRadius: 10 },
      }}
    >
      <div className="h-screen flex overflow-hidden bg-white text-gray-900">
        <Sidebar
          sessions={sessions}
          activeId={activeId}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          onNewChat={newChat}
          onSelect={loadSession}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {isEmpty ? (
            /* DeepSeek 式空态：居中标题 + 输入框 */
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="w-full max-w-3xl">
                <h1 className="text-center text-3xl font-semibold mb-8 tracking-wide">
                  Hi，我是你的医疗健康助手
                </h1>
                <p className="text-center text-gray-400 mb-6 text-sm">
                  基于医学知识库（RAG）检索 PubMed / WHO / NHS / MSD 等权威文献作答
                </p>
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSend={doSend}
                  onStop={stopStreaming}
                  streaming={streaming}
                  deepThink={deepThink}
                  onDeepThinkChange={setDeepThink}
                  size="hero"
                />
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="px-3.5 py-2 text-[13px] rounded-full border border-gray-200 text-gray-600 hover:border-[#4d6bfe] hover:text-[#4d6bfe] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 对话模式：消息流 + 底部输入 */
            <>
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-6">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} msg={m} />
                  ))}
                  <div ref={bottomRef} />
                </div>
              </div>
              <div className="border-t border-gray-100 bg-white/90 backdrop-blur">
                <div className="max-w-3xl mx-auto px-4 py-3">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={doSend}
                    onStop={stopStreaming}
                    streaming={streaming}
                    deepThink={deepThink}
                    onDeepThinkChange={setDeepThink}
                  />
                  <div className="text-center text-[11px] text-gray-400 mt-2">
                    内容由 AI 生成，仅供参考，不能替代专业医疗建议
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}
