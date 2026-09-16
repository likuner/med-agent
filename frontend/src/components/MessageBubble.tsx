"use client";

import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/lib/api";
import ThinkingProcess from "./ThinkingProcess";
import CitationPanel from "./CitationPanel";

export default function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[75%] bg-[#eff6ff] text-gray-800 rounded-2xl rounded-br-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex mb-6">
      <div className="max-w-full flex-1">
        <div className="flex items-center gap-2 mb-1.5 text-[13px] font-medium text-[#4d6bfe]">
          <span className="w-6 h-6 rounded-full bg-[#4d6bfe] text-white text-xs flex items-center justify-center">
            医
          </span>
          Medical Agent
        </div>
        <ThinkingProcess thinking={msg.thinking ?? ""} />
        <div className={`md-body text-[15px] text-gray-900 ${msg.streaming ? "stream-cursor" : ""}`}>
          {msg.content ? (
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          ) : msg.streaming ? (
            <span className="text-gray-400 text-sm">正在思考…</span>
          ) : null}
        </div>
        <CitationPanel citations={msg.citations ?? []} />
      </div>
    </div>
  );
}
