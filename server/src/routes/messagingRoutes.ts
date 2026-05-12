import { Router } from "express";
import { z } from "zod";
import {
  createGroup,
  listGroups,
  listInbox,
  sendDirectMessage
} from "../modules/messaging/messagingService.js";

const dmSchema = z.object({
  senderId: z.string().min(2),
  recipientId: z.string().min(2),
  message: z.string().min(1)
});

const groupSchema = z.object({
  name: z.string().min(2),
  ownerId: z.string().min(2),
  memberIds: z.array(z.string()).default([])
});

export const messagingRoutes = Router();

messagingRoutes.post("/dm", (req, res) => {
  const parsed = dmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const dm = sendDirectMessage(parsed.data.senderId, parsed.data.recipientId, parsed.data.message);
  return res.status(201).json({ dm });
});

messagingRoutes.get("/:userId/inbox", (req, res) =>
  res.json({ messages: listInbox(req.params.userId) })
);

messagingRoutes.get("/groups/all", (_req, res) => res.json({ groups: listGroups() }));

messagingRoutes.post("/groups", (req, res) => {
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const group = createGroup(parsed.data.name, parsed.data.ownerId, parsed.data.memberIds);
  return res.status(201).json({ group });
});
