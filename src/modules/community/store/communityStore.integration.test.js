import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../services/apiClient", async () => {
  const actual = await vi.importActual("../../../services/apiClient");
  return {
    ...actual,
    withMockLatency: async (resolver) => JSON.parse(JSON.stringify(resolver())),
  };
});

import { COMMUNITY_STORAGE_KEY } from "../constants/community.constants";
import { useCommunityStore } from "./communityStore";

const STUDENT_ACTOR = {
  id: "student-store-1",
  name: "Student Store",
  role: "STUDENT",
};

const ADMIN_ACTOR = {
  id: "admin-store-1",
  name: "Admin Store",
  role: "SUPER_ADMIN",
};

describe("communityStore integration", () => {
  beforeEach(() => {
    window.localStorage.removeItem(COMMUNITY_STORAGE_KEY);
    useCommunityStore.getState().resetCommunityState();
  });

  it("bootstraps and selects a default channel", async () => {
    const result = await useCommunityStore.getState().bootstrapForActor({ actor: STUDENT_ACTOR });
    const state = useCommunityStore.getState();

    expect(result.ok).toBe(true);
    expect(state.channels.length).toBeGreaterThan(0);
    expect(state.selectedChannelId).toBe(state.channels[0].id);
  });

  it("creates a message with tags and refreshes tree", async () => {
    await useCommunityStore.getState().bootstrapForActor({ actor: STUDENT_ACTOR });
    const channelId = useCommunityStore.getState().selectedChannelId;

    await useCommunityStore.getState().loadChannelMessages({ actor: STUDENT_ACTOR, channelId });

    const createResult = await useCommunityStore.getState().createMessage({
      actor: STUDENT_ACTOR,
      channelId,
      bodyMarkdown: "Store test message for tagged discussion.",
      tags: ["store-test", "community"],
    });

    const tree = useCommunityStore.getState().messageTree;
    const flattened = tree.flatMap((item) => [item, ...(item.replies || [])]);

    expect(createResult.ok).toBe(true);
    expect(flattened.some((item) => item.bodyMarkdown.includes("Store test message"))).toBe(true);
  });

  it("toggles bookmark state optimistically", async () => {
    await useCommunityStore.getState().bootstrapForActor({ actor: STUDENT_ACTOR });
    const channelId = useCommunityStore.getState().selectedChannelId;
    await useCommunityStore.getState().loadChannelMessages({ actor: STUDENT_ACTOR, channelId });

    const firstMessageId = useCommunityStore.getState().messageTree[0].id;
    const toggleResult = await useCommunityStore.getState().toggleBookmark({
      actor: STUDENT_ACTOR,
      messageId: firstMessageId,
    });

    expect(toggleResult.ok).toBe(true);
    expect(useCommunityStore.getState().bookmarkedMessageIds.includes(firstMessageId)).toBe(true);
  });

  it("loads and updates moderation configuration for admin", async () => {
    await useCommunityStore.getState().bootstrapForActor({ actor: ADMIN_ACTOR });

    const loaded = await useCommunityStore.getState().loadModerationConfig({ actor: ADMIN_ACTOR });
    expect(loaded).toBeTruthy();

    const updated = await useCommunityStore.getState().updateModerationConfig({
      actor: ADMIN_ACTOR,
      patch: {
        wordFilterEnabled: true,
        blockedWordsPlaceholder: ["term1", "term2"],
      },
    });

    expect(updated.ok).toBe(true);
    expect(useCommunityStore.getState().moderationConfig.wordFilterEnabled).toBe(true);
    expect(useCommunityStore.getState().moderationConfig.blockedWordsPlaceholder).toContain("term1");
  });
});
