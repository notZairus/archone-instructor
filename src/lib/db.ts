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

export const getClassroomStudents = async (classroomId: string) => {
  const result = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "classroom_user",
    queries: [Query.equal("classroomId", classroomId)],
  });

  const rows = result.rows.map((row) => ({
    userId: row.userId,
    accepted: row.accepted,
  }));

  const students: Student[] = [];

  for (let i = 0; i < rows.length; i++) {
    const student = await tablesDB.getRow({
      databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
      tableId: "users",
      rowId: rows[i].userId,
    });

    students.push({
      ...student,
      accepted: rows[i].accepted,
    } as unknown as Student);
  }

  return students;
};

export const acceptClassroomStudent = async (
  classroomId: string,
  userId: string,
) => {
  const result = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "classroom_user",
    queries: [
      Query.equal("classroomId", classroomId),
      Query.equal("userId", userId),
      Query.limit(1),
    ],
  });

  const record = result.rows[0];
  if (!record) {
    throw new Error("Student request not found");
  }

  return tablesDB.updateRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "classroom_user",
    rowId: record.$id,
    data: {
      accepted: true,
    },
  });
};
