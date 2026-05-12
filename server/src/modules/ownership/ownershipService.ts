import { idFactory, ownershipChecks } from "../users/userStore.js";
import type { OwnershipVerification } from "../../types/domain.js";

export const verifyOwnership = (
  artistId: string,
  contentTitle: string,
  metadataFingerprint: string
): OwnershipVerification => {
  const status = metadataFingerprint.length > 12 ? "verified" : "review";
  const record: OwnershipVerification = {
    id: idFactory(),
    artistId,
    contentTitle,
    metadataFingerprint,
    status
  };

  ownershipChecks.unshift(record);
  return record;
};

export const listOwnershipChecks = (): OwnershipVerification[] => ownershipChecks;
