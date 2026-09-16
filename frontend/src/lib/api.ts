export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export interface Citation {
  chunk_id: number;
  document_id: number;
  title: string;
  source: string;
  url: string;
  score: number;
  snippet: string;
}

export interface ChatMessage {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  citations?: Citation[];
  streaming?: boolean;
}

export interface SessionInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

// ---- 基础 REST ----

export async function listSessions(): Promise<SessionInfo[]> {
  const r = await fetch(`${API_BASE}/api/sessions`, { cache: "no-store" });
  if (!r.ok) throw new Error("加载会话失败");
  return r.json();
}

export async function createSession(title = "新对话"): Promise<SessionInfo> {
  const r = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!r.ok) throw new Error("创建会话失败");
  return r.json();
}

export async function renameSession(id: string, title: string): Promise<SessionInfo> {
  const r = await fetch(`${API_BASE}/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!r.ok) throw new Error("重命名失败");
  return r.json();
}

export async function deleteSession(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/api/sessions/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("删除失败");
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const r = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, { cache: "no-store" });
  if (!r.ok) throw new Error("加载消息失败");
  return r.json();
}

// ---- SSE 流式聊天 ----

export interface StreamHandlers {
  onSession?: (sessionId: string, title: string) => void;
  onToken?: (text: string) => void;
  onThinking?: (text: string) => void;
  onCitations?: (citations: Citation[]) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

export async function streamChat(
  params: { session_id: string | null; message: string; deep_think: boolean },
  handlers: StreamHandlers,
  signal?: AbortSignal
) {
  const resp = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });
  if (!resp.ok || !resp.body) {
    handlers.onError?.(`请求失败 (${resp.status})`);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE 帧以空行分隔
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";

    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (!data) continue;
      let payload: any;
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }
      switch (event) {
        case "session":
          handlers.onSession?.(payload.session_id, payload.title);
          break;
        case "token":
          handlers.onToken?.(payload.content ?? "");
          break;
        case "thinking":
          handlers.onThinking?.(payload.content ?? "");
          break;
        case "retrieved_docs":
          handlers.onCitations?.(payload.citations ?? []);
          break;
        case "done":
          handlers.onDone?.();
          break;
        case "error":
          handlers.onError?.(payload.message ?? "未知错误");
          break;
      }
    }
  }
  handlers.onDone?.();
}
