import { Router } from "express";
import { z } from "zod";
import {
  addGift,
  listFeaturedStreams,
  postChatMessage,
  startStream
} from "../modules/streaming/streamService.js";

const startStreamSchema = z.object({
  streamerId: z.string().min(2),
  title: z.string().min(2),
  startTime: z.string().datetime().optional(),
  isPremium: z.boolean().default(false)
});

const chatSchema = z.object({
  userId: z.string().min(2),
  message: z.string().min(1)
});

const giftSchema = z.object({
  amount: z.number().positive()
});

export const streamsRoutes = Router();

streamsRoutes.get("/featured", (_req, res) => res.json({ streams: listFeaturedStreams() }));

streamsRoutes.post("/start", (req, res) => {
  const parsed = startStreamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const stream = startStream({
    ...parsed.data,
    startTime: parsed.data.startTime ?? new Date().toISOString()
  });
  return res.status(201).json({ stream });
});

streamsRoutes.post("/:id/chat", (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const message = postChatMessage(req.params.id, parsed.data.userId, parsed.data.message);
  if (!message) {
    return res.status(404).json({ error: "Stream not found" });
  }
  return res.status(201).json({ message });
});

streamsRoutes.post("/:id/gift", (req, res) => {
  const parsed = giftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const stream = addGift(req.params.id, parsed.data.amount);
  if (!stream) {
    return res.status(404).json({ error: "Stream not found" });
  }
  return res.json({ stream });
});
