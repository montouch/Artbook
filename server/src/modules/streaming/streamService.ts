import { idFactory, streams } from "../users/userStore.js";
import type { Stream, StreamChatMessage } from "../../types/domain.js";

interface StartStreamInput {
  streamerId: string;
  title: string;
  startTime: string;
  isPremium: boolean;
}

export const startStream = (input: StartStreamInput): Stream => {
  const stream: Stream = {
    id: idFactory(),
    status: "live",
    gifts: 0,
    chat: [],
    ...input
  };

  streams.unshift(stream);
  return stream;
};

export const listFeaturedStreams = (): Stream[] =>
  streams.filter((stream) => stream.status === "live" || stream.status === "scheduled");

export const postChatMessage = (
  streamId: string,
  userId: string,
  message: string
): StreamChatMessage | undefined => {
  const stream = streams.find((entry) => entry.id === streamId);
  if (!stream) {
    return undefined;
  }

  const chatMessage: StreamChatMessage = {
    id: idFactory(),
    userId,
    message,
    sentAt: new Date().toISOString()
  };

  stream.chat.push(chatMessage);
  return chatMessage;
};

export const addGift = (streamId: string, amount: number): Stream | undefined => {
  const stream = streams.find((entry) => entry.id === streamId);
  if (!stream) {
    return undefined;
  }

  stream.gifts += amount;
  return stream;
};
