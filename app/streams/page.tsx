import { Radio, Video } from "lucide-react";
import { SiteNav } from "@/app/components/SiteNav";
import { streams } from "@/lib/data";

export default function StreamsPage() {
  return (
    <main>
      <section className="page-shell">
        <SiteNav />
        <div className="page-hero">
          <p className="eyebrow">Streaming hub</p>
          <h1>Live rooms, paid schedules, and replay stores.</h1>
          <p>
            Streamers can run free rooms, premium rooms, gift-driven events, and replay drops while
            keeping creator communities active after the live moment.
          </p>
        </div>
      </section>

      <section className="section split-section">
        <div>
          <p className="eyebrow">Live and scheduled</p>
          <h2>Streams stay attached to the creator graph.</h2>
          <div className="stream-stack">
            {streams.map((stream) => (
              <article className="stream-card" key={stream.id}>
                <div className={stream.isLive ? "stream-dot live" : "stream-dot"} />
                <div>
                  <h3>{stream.title}</h3>
                  <p>
                    {stream.creatorName} · {stream.city} · {stream.startsAt}
                  </p>
                </div>
                <div className="stream-price">
                  <span>{stream.price}</span>
                  <strong>{stream.gifts ? `${stream.gifts} gifts` : "scheduled"}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="live-console">
          <div className="console-video">
            <Video size={42} />
            <span>LiveKit/WebRTC ready zone</span>
          </div>
          <div className="chat-bubble left">Drop the chorus again!</div>
          <div className="chat-bubble right">Gift sent: 50 cowries</div>
          <div className="gift-row">
            <button type="button">Cowrie</button>
            <button type="button">Drum</button>
            <button type="button">Crown</button>
          </div>
        </div>
      </section>

      <section className="section roadmap-grid">
        <article>
          <Radio />
          <h3>Paid rooms</h3>
          <p>Schedule private events, replay passes, and ticketed room access.</p>
        </article>
        <article>
          <Video />
          <h3>Replay archive</h3>
          <p>Save highlights and connect them to streamer marketplace listings.</p>
        </article>
      </section>
    </main>
  );
}
