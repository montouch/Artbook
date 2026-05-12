"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Gift, Smile } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const mockChat = [
  { id: 1, user: "Kofi A.", color: "#16a34a", message: "This beat is fire! 🔥", isGift: false },
  { id: 2, user: "Nana B.", color: "#f59e0b", message: "Play that track again!", isGift: false },
  { id: 3, user: "Aisha M.", color: "#ec4899", message: "sent a gift", isGift: true, giftValue: 5 },
  { id: 4, user: "Tunde O.", color: "#06b6d4", message: "Vibes on point 🎵", isGift: false },
  { id: 5, user: "Zola K.", color: "#8b5cf6", message: "Who else is watching from SA?", isGift: false },
  { id: 6, user: "Kemi D.", color: "#ef4444", message: "sent a gift", isGift: true, giftValue: 10 },
  { id: 7, user: "Yaw P.", color: "#10b981", message: "First time here, this is amazing", isGift: false },
  { id: 8, user: "Amina S.", color: "#f97316", message: "Love from Nairobi! 🇰🇪", isGift: false },
];

export function LiveChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockChat);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages([...messages, {
      id: messages.length + 1,
      user: "You",
      color: "#6366f1",
      message: message.trim(),
      isGift: false,
    }]);
    setMessage("");
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-white font-semibold text-sm">Live Chat</h3>
        <p className="text-white/40 text-xs">1,247 watching</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2">
            <Avatar name={msg.user} size="sm" color={msg.color} />
            <div className="min-w-0">
              <span className="text-xs font-medium" style={{ color: msg.color }}>
                {msg.user}
              </span>
              {msg.isGift ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 mt-0.5 inline-flex items-center gap-1">
                  <Gift className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400 text-xs font-medium">
                    ${msg.giftValue}
                  </span>
                </div>
              ) : (
                <p className="text-white/70 text-xs mt-0.5">{msg.message}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 border-t border-white/[0.06] flex gap-2">
        <button className="text-white/40 hover:text-amber-400 transition-colors p-2 rounded-lg hover:bg-white/5">
          <Gift className="w-4 h-4" />
        </button>
        <button className="text-white/40 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
          <Smile className="w-4 h-4" />
        </button>
        <Input
          placeholder="Say something..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSend} disabled={!message.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
