import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:8080";

interface LiveChatMessage {
  userId: string;
  message: string;
  sentAt: string;
}

export const LiveStreamPage = () => {
  const { streamId = "s-1" } = useParams();
  const socket = useMemo(() => io(SOCKET_URL, { transports: ["websocket"] }), []);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    socket.emit("stream:join", streamId);
    socket.on("stream:chat", (payload: LiveChatMessage) => {
      setMessages((current) => [...current, payload]);
    });
    return () => {
      socket.off("stream:chat");
      socket.disconnect();
    };
  }, [socket, streamId]);

  return (
    <section>
      <h2>Live Stream Room</h2>
      <p>Stream #{streamId}</p>
      <div className="card">
        <h3>Real-time chat</h3>
        <div className="chat-list">
          {messages.map((entry, index) => (
            <p key={`${entry.sentAt}-${index}`}>
              <b>{entry.userId}:</b> {entry.message}
            </p>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!input.trim()) return;
            socket.emit("stream:chat", {
              streamId,
              userId: "u-fan-1",
              message: input.trim(),
              sentAt: new Date().toISOString()
            });
            setInput("");
          }}
        >
          <input value={input} onChange={(event) => setInput(event.target.value)} />
          <button type="submit">Send</button>
        </form>
      </div>
    </section>
  );
};
