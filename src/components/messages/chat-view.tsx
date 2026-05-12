"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Phone, VideoIcon, MoreHorizontal } from "lucide-react";
import { useState } from "react";

interface ChatViewProps {
  contact: {
    name: string | null;
    profileColor?: string | null;
    verified?: boolean;
  };
}

const mockConversation = [
  { id: 1, fromMe: false, text: "Hey! Love your latest track", time: "2:30 PM" },
  { id: 2, fromMe: true, text: "Thank you so much! Means a lot 🙏", time: "2:32 PM" },
  { id: 3, fromMe: false, text: "When's the next release?", time: "2:33 PM" },
  { id: 4, fromMe: true, text: "Working on something special. Stay tuned!", time: "2:35 PM" },
  { id: 5, fromMe: false, text: "Can't wait! 🔥", time: "2:36 PM" },
];

export function ChatView({ contact }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockConversation);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages([...messages, {
      id: messages.length + 1,
      fromMe: true,
      text: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Avatar name={contact.name} color={contact.profileColor || undefined} verified={contact.verified} />
          <div>
            <h3 className="text-white font-medium text-sm">{contact.name}</h3>
            <p className="text-green-400 text-xs">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <VideoIcon className="w-4 h-4" />
          </button>
          <button className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                msg.fromMe
                  ? "bg-indigo-600 text-white rounded-br-md"
                  : "bg-white/[0.06] text-white/80 rounded-bl-md"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.fromMe ? "text-white/50" : "text-white/30"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/[0.06] flex gap-2">
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={!message.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
