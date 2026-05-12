import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8080);
const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

io.on("connection", (socket) => {
  socket.on("stream:join", (streamId: string) => {
    socket.join(streamId);
  });

  socket.on(
    "stream:chat",
    (payload: { streamId: string; userId: string; message: string; sentAt: string }) => {
      io.to(payload.streamId).emit("stream:chat", payload);
    }
  );

  socket.on("stream:gift", (payload: { streamId: string; fromUserId: string; amount: number }) => {
    io.to(payload.streamId).emit("stream:gift", payload);
  });
});

httpServer.listen(port, () => {
  console.log(`Artbook API listening on http://localhost:${port}`);
});
