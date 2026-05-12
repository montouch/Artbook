import { Router } from "express";
import { z } from "zod";
import { listOwnershipChecks, verifyOwnership } from "../modules/ownership/ownershipService.js";

const verificationSchema = z.object({
  artistId: z.string().min(2),
  contentTitle: z.string().min(2),
  metadataFingerprint: z.string().min(6)
});

export const ownershipRoutes = Router();

ownershipRoutes.get("/", (_req, res) => res.json({ records: listOwnershipChecks() }));

ownershipRoutes.post("/verify", (req, res) => {
  const parsed = verificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const record = verifyOwnership(
    parsed.data.artistId,
    parsed.data.contentTitle,
    parsed.data.metadataFingerprint
  );
  return res.status(201).json({ record });
});
