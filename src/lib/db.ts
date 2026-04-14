import { tablesDB } from "./appwrite";
import { Query, ID } from "appwrite";

export const getUserWithEmail = async (email: string) => {
  const result = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "users",
    queries: [Query.equal("email", email), Query.limit(1)],
  });

  return result.rows[0] || null;
};

export const saveClassroom = async (
  userId: string,
  name: string,
  description: string,
  code: string,
) => {
  const newClassroom = await tablesDB.createRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "classrooms",
    rowId: ID.unique(),
    data: {
      userId,
      name,
      description,
      code,
    },
  });

  return newClassroom;
};
