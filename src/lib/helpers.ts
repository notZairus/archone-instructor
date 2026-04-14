export const createClassroomCode = (name: string) => {
  const classToken = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);

  const randomToken = Math.floor(Math.random() * 900 + 100);

  return `ARCH-${classToken || "CLS"}${randomToken}`;
};
