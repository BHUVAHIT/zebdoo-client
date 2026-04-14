import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../services/apiClient", async () => {
  const actual = await vi.importActual("../../../services/apiClient");
  return {
    ...actual,
    withMockLatency: async (resolver) => JSON.parse(JSON.stringify(resolver())),
  };
});

import { ANNOUNCEMENT_PRIORITIES, COMMUNITY_STORAGE_KEY } from "../constants/community.constants";
import { communityService } from "./communityService";

const STUDENT_ACTOR = {
  id: "student-1",
  name: "Student One",
  role: "STUDENT",
};

const ADMIN_ACTOR = {
  id: "admin-1",
  name: "Super Admin",
  role: "SUPER_ADMIN",
};

describe("communityService integration", () => {
  beforeEach(() => {
    window.localStorage.removeItem(COMMUNITY_STORAGE_KEY);
  });

  it("bootstraps student data with core sections", async () => {
    const payload = await communityService.bootstrap({ actor: STUDENT_ACTOR });

    expect(Array.isArray(payload.channels)).toBe(true);
    expect(payload.channels.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.announcements)).toBe(true);
    expect(Array.isArray(payload.topContributors)).toBe(true);
    expect(Array.isArray(payload.activeUsers)).toBe(true);
    expect(Array.isArray(payload.trendingTopics)).toBe(true);
  });

  it("prevents students from creating announcements", async () => {
    await expect(
      communityService.createAnnouncement({
        actor: STUDENT_ACTOR,
        payload: {
          title: "Unauthorized announcement",
          bodyRichText: "This should not be created by a student.",
          priority: ANNOUNCEMENT_PRIORITIES.GENERAL,
          targetAudience: "ALL",
        },
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("allows admin announcement create and list", async () => {
    const created = await communityService.createAnnouncement({
      actor: ADMIN_ACTOR,
      payload: {
        title: "Admin update notice",
        bodyRichText: "A structured update from the admin side for all users.",
        priority: ANNOUNCEMENT_PRIORITIES.UPDATE,
        targetAudience: "ALL",
      },
    });

    const listed = await communityService.listAnnouncements({
      actor: ADMIN_ACTOR,
      query: { page: 1, pageSize: 50 },
    });

    expect(created.id).toBeTruthy();
    expect(listed.items.some((item) => item.id === created.id)).toBe(true);
  });

  it("toggles bookmarks and returns saved messages", async () => {
    const studentBootstrap = await communityService.bootstrap({ actor: STUDENT_ACTOR });
    const channelId = studentBootstrap.channels[0].id;

    const messagesPayload = await communityService.listChannelMessages({
      actor: STUDENT_ACTOR,
      channelId,
    });
    const firstMessageId = messagesPayload.messages[0].id;

    const bookmarked = await communityService.toggleBookmark({
      actor: STUDENT_ACTOR,
      messageId: firstMessageId,
    });
    const savedList = await communityService.listBookmarkedMessages({
      actor: STUDENT_ACTOR,
      query: { page: 1, pageSize: 10 },
    });

    expect(bookmarked.bookmarked).toBe(true);
    expect(savedList.items.some((item) => item.id === firstMessageId)).toBe(true);
  });

  it("blocks message creation when word filter is enabled", async () => {
    await communityService.updateModerationConfig({
      actor: ADMIN_ACTOR,
      patch: {
        wordFilterEnabled: true,
        blockedWordsPlaceholder: ["blockedphrase"],
      },
    });

    const bootstrap = await communityService.bootstrap({ actor: STUDENT_ACTOR });
    const channelId = bootstrap.channels[0].id;

    await expect(
      communityService.createMessage({
        actor: STUDENT_ACTOR,
        channelId,
        payload: {
          bodyMarkdown: "This message contains blockedphrase and should fail.",
        },
      })
    ).rejects.toMatchObject({
      code: "BLOCKED_CONTENT",
      status: 400,
    });
  });

  it("tracks warning and ban moderation summary", async () => {
    await communityService.warnUser({
      actor: ADMIN_ACTOR,
      targetUserId: STUDENT_ACTOR.id,
      reason: "Repeated guideline violation",
    });

    const banResult = await communityService.toggleUserBan({
      actor: ADMIN_ACTOR,
      targetUserId: STUDENT_ACTOR.id,
      reason: "Escalated moderation action",
    });

    const summary = await communityService.getUserModerationSummary({
      actor: ADMIN_ACTOR,
    });

    expect(banResult.banned).toBe(true);
    expect(summary.totalWarnings).toBeGreaterThanOrEqual(1);
    expect(summary.activeBans).toBeGreaterThanOrEqual(1);
  });
});
