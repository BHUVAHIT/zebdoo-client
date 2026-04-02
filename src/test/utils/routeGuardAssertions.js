import { expect } from "vitest";

const getLocationProbe = (container) => container.querySelector('[data-path="location"]');

const readAttribute = (node, name) => node?.getAttribute(name) || "";

export const readRouteLocation = (container) => {
  const node = getLocationProbe(container);

  return {
    path: node?.textContent || "",
    search: readAttribute(node, "data-search"),
    hash: readAttribute(node, "data-hash"),
    fromPath: readAttribute(node, "data-from-path"),
    fromSearch: readAttribute(node, "data-from-search"),
    fromHash: readAttribute(node, "data-from-hash"),
    unauthorized: readAttribute(node, "data-unauthorized") === "true",
  };
};

export const expectRoutePath = (container, expectedPath) => {
  expect(readRouteLocation(container).path).toBe(expectedPath);
};

export const expectRedirectFrom = (
  container,
  {
    path = "",
    search = "",
    hash = "",
  } = {}
) => {
  const location = readRouteLocation(container);
  expect(location.fromPath).toBe(path);
  expect(location.fromSearch).toBe(search);
  expect(location.fromHash).toBe(hash);
};

export const expectUnauthorizedRedirectState = (container, expected = false) => {
  expect(readRouteLocation(container).unauthorized).toBe(Boolean(expected));
};

export const expectRouteSearchHash = (
  container,
  {
    search = "",
    hash = "",
  } = {}
) => {
  const location = readRouteLocation(container);
  expect(location.search).toBe(search);
  expect(location.hash).toBe(hash);
};
