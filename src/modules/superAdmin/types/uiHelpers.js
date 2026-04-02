export const formatDate = (isoValue) => {
  if (!isoValue) return "-";

  const date = new Date(isoValue);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
};

export const cleanPayload = (payload) =>
  Object.keys(payload).reduce((acc, key) => {
    const value = payload[key];
    acc[key] = typeof value === "string" ? value.trim() : value;
    return acc;
  }, {});
