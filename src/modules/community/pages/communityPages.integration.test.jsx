import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

const ADMIN_ACTOR = {
  id: "page-admin-1",
  name: "Page Admin",
  role: "SUPER_ADMIN",
};

vi.mock("../../../hooks/useAuth", () => ({
  default: () => ({ user: ADMIN_ACTOR }),
}));

vi.mock("../../../components/notifications/useAppToast", () => ({
  useAppToast: () => ({
    pushToast: vi.fn(),
  }),
}));

import StudentCommunityPage from "./StudentCommunityPage";
import AdminCommunityOverviewPage from "./AdminCommunityOverviewPage";
import AdminCommunityAnnouncementsPage from "./AdminCommunityAnnouncementsPage";
import AdminCommunityModerationPage from "./AdminCommunityModerationPage";

const renderWithRouter = (node) =>
  renderToString(<MemoryRouter>{node}</MemoryRouter>);

describe("community page smoke tests", () => {
  it("renders student community shell", () => {
    const html = renderWithRouter(<StudentCommunityPage />);
    expect(html).toContain("Student Community");
  });

  it("renders admin overview shell", () => {
    const html = renderWithRouter(<AdminCommunityOverviewPage />);
    expect(html).toContain("Community Command Center");
  });

  it("renders admin announcements shell", () => {
    const html = renderWithRouter(<AdminCommunityAnnouncementsPage />);
    expect(html).toContain("Announcements Management");
  });

  it("renders admin moderation shell", () => {
    const html = renderWithRouter(<AdminCommunityModerationPage />);
    expect(html).toContain("Moderation Console");
  });
});
