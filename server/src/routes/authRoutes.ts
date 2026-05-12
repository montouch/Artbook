import { Router } from "express";
import { z } from "zod";
import { idFactory, users } from "../modules/users/userStore.js";
import type { User } from "../types/domain.js";

const registerSchema = z.object({
  handle: z.string().min(3),
  displayName: z.string().min(2),
  accountType: z.enum(["artist", "streamer", "fan"]),
  location: z.string().min(2),
  genres: z.array(z.string()).default([]),
  niches: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  isPremium: z.boolean().default(false)
});

export const authRoutes = Router();

authRoutes.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const user: User = {
    id: idFactory(),
    followers: 0,
    customization: {
      fontFamily: "Inter",
      primaryColor: "#1F2041",
      secondaryColor: "#4B3F72",
      layout: "classic"
    },
    ...payload
  };

  users.push(user);
  return res.status(201).json({ user });
});
