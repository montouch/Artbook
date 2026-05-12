"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { genres, moods } from "@/lib/utils";
import { Upload, Music, Video, X, FileAudio, FileVideo } from "lucide-react";
import { useState } from "react";

export function UploadForm() {
  const [contentType, setContentType] = useState<"AUDIO" | "VIDEO">("AUDIO");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Content type selector */}
      <div className="flex gap-3">
        <button
          onClick={() => setContentType("AUDIO")}
          className={`flex-1 p-4 rounded-xl border transition-all ${
            contentType === "AUDIO"
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-white/10 hover:border-white/20 bg-white/[0.02]"
          }`}
        >
          <Music className={`w-6 h-6 mx-auto ${contentType === "AUDIO" ? "text-indigo-400" : "text-white/40"}`} />
          <p className={`text-sm font-medium mt-2 ${contentType === "AUDIO" ? "text-indigo-400" : "text-white/50"}`}>
            Audio
          </p>
          <p className="text-xs text-white/30 mt-1">MP3, WAV</p>
        </button>
        <button
          onClick={() => setContentType("VIDEO")}
          className={`flex-1 p-4 rounded-xl border transition-all ${
            contentType === "VIDEO"
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-white/10 hover:border-white/20 bg-white/[0.02]"
          }`}
        >
          <Video className={`w-6 h-6 mx-auto ${contentType === "VIDEO" ? "text-indigo-400" : "text-white/40"}`} />
          <p className={`text-sm font-medium mt-2 ${contentType === "VIDEO" ? "text-indigo-400" : "text-white/50"}`}>
            Video
          </p>
          <p className="text-xs text-white/30 mt-1">MP4</p>
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          dragOver ? "border-indigo-500 bg-indigo-500/5" : "border-white/10 hover:border-white/20"
        }`}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            {contentType === "AUDIO" ? (
              <FileAudio className="w-8 h-8 text-indigo-400" />
            ) : (
              <FileVideo className="w-8 h-8 text-indigo-400" />
            )}
            <div className="text-left">
              <p className="text-white text-sm font-medium">{file.name}</p>
              <p className="text-white/40 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button onClick={() => setFile(null)} className="text-white/40 hover:text-red-400 ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-white/20 mx-auto" />
            <p className="text-white/50 text-sm mt-3">
              Drag and drop your {contentType === "AUDIO" ? "audio" : "video"} file here
            </p>
            <p className="text-white/30 text-xs mt-1">
              or click to browse ({contentType === "AUDIO" ? "MP3, WAV up to 50MB" : "MP4 up to 500MB"})
            </p>
            <input
              type="file"
              accept={contentType === "AUDIO" ? "audio/*" : "video/*"}
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="inline-block mt-4 cursor-pointer px-3 py-1.5 text-xs font-medium rounded-xl border border-white/20 hover:border-white/40 text-white hover:bg-white/5 transition-all">
              Browse Files
            </label>
          </>
        )}
      </div>

      {/* Details form */}
      <Card className="p-6 space-y-4">
        <h3 className="text-white font-semibold">Details</h3>

        <div>
          <label className="text-white/50 text-xs font-medium block mb-1.5">Title *</label>
          <Input
            placeholder="Give your content a title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="text-white/50 text-xs font-medium block mb-1.5">Description</label>
          <textarea
            placeholder="Tell listeners what this is about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-24"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/50 text-xs font-medium block mb-1.5">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
            >
              <option value="" className="bg-slate-900">Select genre</option>
              {genres.map((g) => (
                <option key={g} value={g} className="bg-slate-900">{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs font-medium block mb-1.5">Mood</label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
            >
              <option value="" className="bg-slate-900">Select mood</option>
              {moods.map((m) => (
                <option key={m} value={m} className="bg-slate-900 capitalize">{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
          <input
            type="checkbox"
            checked={isPremium}
            onChange={(e) => setIsPremium(e.target.checked)}
            className="w-4 h-4 rounded accent-amber-500"
          />
          <div>
            <p className="text-amber-400 text-sm font-medium">Premium Content</p>
            <p className="text-white/40 text-xs">Only subscribers can access this content</p>
          </div>
        </div>

        <Button className="w-full" size="lg" disabled={!title.trim()}>
          <Upload className="w-4 h-4" />
          Publish Content
        </Button>
      </Card>
    </div>
  );
}
