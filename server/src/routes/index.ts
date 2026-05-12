import { Router } from "express";
import { authRoutes } from "./authRoutes.js";
import { contentRoutes } from "./contentRoutes.js";
import { discoveryRoutes } from "./discoveryRoutes.js";
import { marketplaceRoutes } from "./marketplaceRoutes.js";
import { messagingRoutes } from "./messagingRoutes.js";
import { ownershipRoutes } from "./ownershipRoutes.js";
import { paymentsRoutes } from "./paymentsRoutes.js";
import { streamsRoutes } from "./streamsRoutes.js";
import { usersRoutes } from "./usersRoutes.js";

export const apiRoutes = Router();

apiRoutes.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "artbook-api", timestamp: new Date().toISOString() })
);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/users", usersRoutes);
apiRoutes.use("/discovery", discoveryRoutes);
apiRoutes.use("/content", contentRoutes);
apiRoutes.use("/streams", streamsRoutes);
apiRoutes.use("/messages", messagingRoutes);
apiRoutes.use("/marketplace", marketplaceRoutes);
apiRoutes.use("/payments", paymentsRoutes);
apiRoutes.use("/ownership", ownershipRoutes);
