import { Router } from "express";
import { z } from "zod";
import { users } from "../modules/users/userStore.js";

const customizationSchema = z.object({
  fontFamily: z.string().min(2),
  primaryColor: z.string().min(4),
  secondaryColor: z.string().min(4),
  layout: z.enum(["classic", "immersive", "minimal"])
});

export const usersRoutes = Router();

usersRoutes.get("/:id", (req, res) => {
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user });
});

usersRoutes.patch("/:id/customization", (req, res) => {
  const parsed = customizationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  user.customization = parsed.data;
  return res.json({ user });
});
