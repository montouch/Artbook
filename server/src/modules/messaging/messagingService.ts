import { dms, groups, idFactory } from "../users/userStore.js";
import type { DirectMessage, Group } from "../../types/domain.js";

export const sendDirectMessage = (
  senderId: string,
  recipientId: string,
  message: string
): DirectMessage => {
  const dm: DirectMessage = {
    id: idFactory(),
    senderId,
    recipientId,
    message,
    sentAt: new Date().toISOString()
  };
  dms.push(dm);
  return dm;
};

export const listInbox = (userId: string): DirectMessage[] =>
  dms.filter((message) => message.senderId === userId || message.recipientId === userId);

export const createGroup = (name: string, ownerId: string, memberIds: string[]): Group => {
  const group: Group = {
    id: idFactory(),
    name,
    ownerId,
    memberIds: Array.from(new Set([ownerId, ...memberIds]))
  };
  groups.push(group);
  return group;
};

export const listGroups = (): Group[] => groups;
