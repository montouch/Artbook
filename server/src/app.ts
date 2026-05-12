import cors from "cors";
import express from "express";
import { apiRoutes } from "./routes/index.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: "*"
    })
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", apiRoutes);

  return app;
};
