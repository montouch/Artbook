import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { listContent, uploadContent } from "../modules/content/contentService.js";

const upload = multer({ storage: multer.memoryStorage() });

const uploadSchema = z.object({
  ownerId: z.string().min(2),
  title: z.string().min(2),
  mediaType: z.enum(["audio", "video"]),
  genre: z.string().min(2),
  niches: z.array(z.string()).default([]),
  location: z.string().min(2),
  isPremium: z.coerce.boolean().default(false),
  mood: z.enum(["calm", "hype", "soulful", "experimental"])
});

export const contentRoutes = Router();

contentRoutes.get("/", (_req, res) => res.json({ items: listContent() }));

contentRoutes.post("/upload", upload.single("media"), (req, res) => {
  const parsed = uploadSchema.safeParse({
    ...req.body,
    niches: req.body.niches
      ? String(req.body.niches)
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : []
  });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const item = uploadContent({
    ...parsed.data,
    url: req.file ? `memory://${req.file.originalname}` : "https://cdn.example/artbook/placeholder"
  });

  return res.status(201).json({ item });
});
