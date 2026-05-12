"use client";

import { Avatar } from "@/components/ui/avatar";
import { cn, timeAgo } from "@/lib/utils";

interface MessageListProps {
  messages: {
    id: string;
    sender: {
      id: string;
      name: string | null;
      image?: string | null;
      profileColor?: string | null;
      verified?: boolean;
    };
    lastMessage: string;
    time: Date;
    unread: number;
  }[];
  activeId?: string;
  onSelect: (id: string) => void;
}

export function MessageList({ messages, activeId, onSelect }: MessageListProps) {
  return (
    <div className="space-y-1">
      {messages.map((msg) => (
        <button
          key={msg.id}
          onClick={() => onSelect(msg.id)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
            activeId === msg.id
              ? "bg-indigo-600/10 border border-indigo-500/20"
              : "hover:bg-white/[0.03]"
          )}
        >
          <div className="relative">
            <Avatar
              name={msg.sender.name}
              size="md"
              color={msg.sender.profileColor || undefined}
              verified={msg.sender.verified}
            />
            {msg.unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {msg.unread}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium truncate">{msg.sender.name}</span>
              <span className="text-white/30 text-[10px] flex-shrink-0">{timeAgo(msg.time)}</span>
            </div>
            <p className={cn(
              "text-xs truncate mt-0.5",
              msg.unread > 0 ? "text-white/70 font-medium" : "text-white/40"
            )}>
              {msg.lastMessage}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
