"use client";

import { useState, useRef, useEffect } from "react";
import { AgentType } from "@/lib/supabase/types";
import { AGENT_DISPLAY } from "@/lib/agents/router";
import { useVoice } from "@/hooks/useVoice";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent_type?: AgentType;
  input_method?: "text" | "voice";
  created_at: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatPanel({ isOpen, onToggle }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("chief_of_staff");
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useVoice();

  // Sync voice transcript to input
  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      input_method: isListening ? "voice" : "text",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    resetTranscript();
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_type: selectedAgent,
          message: messageText,
          conversation_history: messages.slice(-10),
        }),
      });

      if (!response.ok) throw new Error("Agent unavailable");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "content_delta") {
                  fullContent += data.delta;
                  setStreamingContent(fullContent);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent || "I could not process that request. Please try again.",
        agent_type: selectedAgent,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Agent temporarily unavailable. The dashboard continues to work — try again in a moment.",
          agent_type: selectedAgent,
          created_at: new Date().toISOString(),
        },
      ]);
      setStreamingContent("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isListening) stopListening();
      sendMessage();
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      // Auto-send after voice stops
      setTimeout(() => {
        if (input.trim()) sendMessage();
      }, 500);
    } else {
      startListening();
    }
  };

  const agentInfo = AGENT_DISPLAY[selectedAgent];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gold text-dark flex items-center justify-center text-xl shadow-lg hover:scale-105 transition-transform z-50"
        title="Open chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="w-[380px] bg-dark-2 border-l border-dark-4 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agentInfo.icon}</span>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as AgentType)}
            className="bg-dark-3 text-white text-xs font-semibold rounded-md px-2 py-1.5 border border-dark-4 focus:border-gold outline-none"
          >
            {Object.entries(AGENT_DISPLAY).map(([type, info]) => (
              <option key={type} value={type}>
                {info.icon} {info.name}
              </option>
            ))}
          </select>
        </div>
        <button onClick={onToggle} className="text-grey hover:text-gold transition-colors text-lg">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">{agentInfo.icon}</div>
            <div className="text-sm text-grey">
              Ask {agentInfo.name} anything about your business.
            </div>
            <div className="text-xs text-dark-5 mt-2">
              Try: &quot;What&apos;s on my plate today?&quot;
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-dark-3 ml-8"
                : "bg-gold-dim border-l-2 border-gold mr-4"
            }`}
          >
            {msg.role === "assistant" && msg.agent_type && (
              <div className="text-[10px] font-semibold text-gold mb-1">
                {AGENT_DISPLAY[msg.agent_type]?.icon} {AGENT_DISPLAY[msg.agent_type]?.name}
              </div>
            )}
            <div className="whitespace-pre-wrap">{msg.content}</div>
            {msg.input_method === "voice" && (
              <div className="text-[9px] text-dark-5 mt-1">🎤 Voice input</div>
            )}
          </div>
        ))}

        {streamingContent && (
          <div className="bg-gold-dim border-l-2 border-gold rounded-lg px-3 py-2.5 text-sm mr-4">
            <div className="text-[10px] font-semibold text-gold mb-1">
              {agentInfo.icon} {agentInfo.name}
            </div>
            <div className="whitespace-pre-wrap cursor-blink">{streamingContent}</div>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="bg-gold-dim border-l-2 border-gold rounded-lg px-3 py-2.5 text-sm mr-4">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-dark-4">
        <div className="flex items-center gap-2 bg-dark-3 rounded-lg px-3 py-2 border border-dark-4 focus-within:border-gold transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : `Ask ${agentInfo.name}...`}
            rows={1}
            className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder:text-dark-5"
          />
          {isSupported && (
            <button
              onClick={handleVoiceToggle}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? "bg-status-red text-white voice-recording"
                  : "text-grey hover:text-gold hover:bg-dark-4"
              }`}
              title={isListening ? "Stop recording" : "Start voice input"}
            >
              🎤
            </button>
          )}
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-full bg-gold text-dark flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gold-deep transition-colors"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
