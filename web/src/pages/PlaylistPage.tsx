const playlist = [
  { id: "p1", title: "Lagos Dawn Sessions", artist: "Lagos Beats", mood: "calm" },
  { id: "p2", title: "Accra Night Drive", artist: "Accra Live Studio", mood: "hype" },
  { id: "p3", title: "Nairobi Soul Picks", artist: "Indie Circle", mood: "soulful" }
];

export const PlaylistPage = () => (
  <section>
    <h2>Playlist</h2>
    <p>Fans create mood-based playlists that feed discovery recommendations.</p>
    <div className="grid">
      {playlist.map((entry) => (
        <article className="card" key={entry.id}>
          <h3>{entry.title}</h3>
          <p>{entry.artist}</p>
          <small>Mood: {entry.mood}</small>
        </article>
      ))}
    </div>
  </section>
);
