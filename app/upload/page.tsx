import { BadgeCheck, Package, Palette, ShieldCheck, UploadCloud } from "lucide-react";
import { SiteNav } from "@/app/components/SiteNav";

export default function UploadPage() {
  return (
    <main>
      <section className="page-shell">
        <SiteNav />
        <div className="page-hero">
          <p className="eyebrow">Upload dashboard</p>
          <h1>Media intake with ownership protection built into the flow.</h1>
          <p>
            Artists and streamers can prepare audio, video, merch, stems, and subscriber-only extras
            before they publish to profiles, streams, or marketplace listings.
          </p>
        </div>
      </section>

      <section className="section upload-section">
        <div className="upload-copy">
          <p className="eyebrow">Readiness</p>
          <h2>Uploads carry metadata before monetization.</h2>
          <p>
            The MVP models upload readiness for MP3, WAV, and MP4 files with genre, niche, location,
            premium access, and verification checkpoints.
          </p>
        </div>
        <div className="upload-board">
          <div className="upload-dropzone">
            <UploadCloud size={38} />
            <strong>Drop audio or video</strong>
            <span>MP3, WAV, and MP4 up to your storage limit</span>
          </div>
          <div className="checklist">
            <div>
              <ShieldCheck />
              <span>Metadata fingerprint queued</span>
            </div>
            <div>
              <BadgeCheck />
              <span>Original ownership attestation required</span>
            </div>
            <div>
              <Palette />
              <span>Emotion UI palette generated from mood and genre</span>
            </div>
            <div>
              <Package />
              <span>Attach merch, stems, or subscriber-only extras</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
