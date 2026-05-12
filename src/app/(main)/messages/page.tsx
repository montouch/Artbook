"use client";

import { MessageList } from "@/components/messages/message-list";
import { ChatView } from "@/components/messages/chat-view";
import { Input } from "@/components/ui/input";
import { mockMessages } from "@/lib/mock-data";
import { Search, Edit, MessageCircle } from "lucide-react";
import { useState } from "react";

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const activeMessage = mockMessages.find((m) => m.id === activeChat);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className={`w-full lg:w-80 border-r border-white/[0.06] flex flex-col ${activeChat ? "hidden lg:flex" : ""}`}>
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white">Messages</h1>
            <button className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>
          <Input placeholder="Search conversations..." icon={<Search className="w-4 h-4" />} />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <MessageList
            messages={mockMessages}
            activeId={activeChat || undefined}
            onSelect={setActiveChat}
          />
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 ${!activeChat ? "hidden lg:flex" : "flex"} flex-col`}>
        {activeMessage ? (
          <ChatView contact={activeMessage.sender} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-white/10 mx-auto" />
              <p className="text-white/30 mt-4">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
