import { Router } from "express";
import { getUserById, rankDiscoveryFeed } from "../modules/discovery/discoveryService.js";

export const discoveryRoutes = Router();

discoveryRoutes.get("/", (req, res) => {
  const viewerId = String(req.query.userId ?? "");
  const viewer = getUserById(viewerId);
  if (!viewer) {
    return res.status(404).json({ error: "Viewer not found. Pass ?userId=<id>" });
  }

  const feed = rankDiscoveryFeed(viewer);
  return res.json({ feed, algorithm: "locality+niche+genre weighting" });
});
