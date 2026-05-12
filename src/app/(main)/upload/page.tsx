"use client";

import { UploadForm } from "@/components/upload/upload-form";
import { Upload } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Upload className="w-7 h-7 text-indigo-400" />
          Upload Content
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Share your music and videos with the world
        </p>
      </div>

      <UploadForm />
    </div>
  );
}
