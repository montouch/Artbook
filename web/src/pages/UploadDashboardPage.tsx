import { FormEvent, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

export const UploadDashboardPage = () => {
  const [status, setStatus] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`${API_BASE}/content/upload`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      setStatus("Upload failed");
      return;
    }
    setStatus("Upload submitted + queued for ownership verification.");
    event.currentTarget.reset();
  };

  return (
    <section>
      <h2>Upload Dashboard</h2>
      <p>Upload audio/video, add genre + niche tags, and set premium visibility.</p>
      <form className="card form-grid" onSubmit={onSubmit}>
        <input name="ownerId" defaultValue="u-artist-1" required />
        <input name="title" placeholder="Track or video title" required />
        <select name="mediaType" defaultValue="audio">
          <option value="audio">Audio</option>
          <option value="video">Video</option>
        </select>
        <input name="genre" placeholder="afrobeats" required />
        <input name="niches" placeholder="street-session, sunrise-vibes" />
        <input name="location" defaultValue="Lagos, NG" required />
        <select name="mood" defaultValue="calm">
          <option value="calm">Calm</option>
          <option value="hype">Hype</option>
          <option value="soulful">Soulful</option>
          <option value="experimental">Experimental</option>
        </select>
        <label className="checkbox">
          <input name="isPremium" type="checkbox" value="true" />
          Premium only
        </label>
        <input name="media" type="file" />
        <button type="submit">Upload</button>
      </form>
      {status && <p className="muted">{status}</p>}
    </section>
  );
};
