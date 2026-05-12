import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../api/client";

interface InboxMessage {
  id: string;
  senderId: string;
  message: string;
  sentAt: string;
}

export const MessagesPage = () => {
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [draft, setDraft] = useState("");

  const loadInbox = () => {
    apiClient
      .getInbox("u-fan-1")
      .then((payload) => setInbox(payload.messages))
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;

    await apiClient.sendDm({
      senderId: "u-fan-1",
      recipientId: "u-artist-1",
      message: draft.trim()
    });
    setDraft("");
    loadInbox();
  };

  return (
    <section>
      <h2>Direct Messages</h2>
      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="message">Send message to artist</label>
        <textarea
          id="message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
        />
        <button type="submit">Send DM</button>
      </form>
      <div className="grid">
        {inbox.map((message) => (
          <article className="card" key={message.id}>
            <p>
              <b>{message.senderId}</b>: {message.message}
            </p>
            <small>{new Date(message.sentAt).toLocaleString()}</small>
          </article>
        ))}
      </div>
    </section>
  );
};
