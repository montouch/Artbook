import { Camera, MessageCircle, Send, Users } from "lucide-react";
import { SiteNav } from "@/app/components/SiteNav";
import { conversations } from "@/lib/data";

export default function CommunityPage() {
  return (
    <main>
      <section className="page-shell">
        <SiteNav />
        <div className="page-hero">
          <p className="eyebrow">Community</p>
          <h1>Creator identity powers the social layer.</h1>
          <p>
            Social features now talk to creators directly: they can discover artists, join groups,
            message each other, build playlists, and sell in the creator marketplace.
          </p>
        </div>
      </section>

      <section className="section social-grid">
        <div className="social-card">
          <MessageCircle size={28} />
          <h2>Messages and groups</h2>
          <p>
            Creators can DM artists and streamers, add friends, and join community rooms attached to
            playlists, live shows, and local scenes.
          </p>
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <div className="conversation" key={conversation.id}>
                <div className="conversation-avatar">{conversation.name[0]}</div>
                <div>
                  <strong>{conversation.name}</strong>
                  <span>{conversation.preview}</span>
                </div>
                {conversation.unread ? <em>{conversation.unread}</em> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="social-card">
          <Users size={28} />
          <h2>Status and creator spaces</h2>
          <p>
            Lightweight stories, listening rooms, local crews, and premium creator circles keep
            social discovery fluid without burying users in heavy menus.
          </p>
          <div className="status-card">
            <Camera />
            <div>
              <strong>Ama Nile posted a studio story</strong>
              <span>Poll: soft keys or choir outro?</span>
            </div>
          </div>
          <div className="status-card">
            <Send />
            <div>
              <strong>Accra alté crew</strong>
              <span>28 creators building a Friday night playlist.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
