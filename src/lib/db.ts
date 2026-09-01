import { tablesDB } from "./appwrite";
import { Query, ID } from "appwrite";
import type { Student } from "@/types/global";

type UserRole = "student" | "instructor";

export const getUserWithEmail = async (email: string) => {
  const result = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "users",
    queries: [Query.equal("email", email), Query.limit(1)],
  });

  return result.rows[0] || null;
};

export const getUserById = async (userId: string) => {
  const result = await tablesDB.getRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "users",
    rowId: userId,
  });

  return result;
};

export const createUser = async ({
  id,
  name,
  email,
  role,
}: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}) => {
  const newUser = await tablesDB.createRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "users",
    rowId: id,
    data: {
      name,
      email,
      role,
    },
  });

  return newUser;
};

export const verifyUserById = async (userId: string) => {
  await tablesDB.updateRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "users",
    rowId: userId,
    data: {
      status: "verified",
    },
  });
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

export const declineClassroomStudent = async (
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

  return tablesDB.deleteRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "classroom_user",
    rowId: record.$id,
  });
};

export const getUserAnalyses = async (userId: string) => {
  const analyses = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "analyses",
    queries: [Query.equal("userId", userId)],
  });

  const formattedAnalyses = analyses.rows.map((analysis) => ({
    id: analysis.$id,
    fileName: analysis.fileName,
    fileType: analysis.fileType,
    userId: analysis.userId,
    code: analysis.code,
    createdAt: analysis.$createdAt,
    updatedAt: analysis.$updatedAt,
  }));

  const properties = ["comments", "issues", "functions", "variables"];

  const formattedAnalysesWithProperties = await Promise.all(
    formattedAnalyses.map(async (analysis) => {
      const analysisId = analysis.id;
      const propertiesData: Record<string, unknown[]> = {};

      for (const property of properties) {
        propertiesData[property] = await getAnalysisProperty(
          property,
          analysisId,
        );
      }

      return {
        ...analysis,
        ...propertiesData,
      };
    }),
  );

  return formattedAnalysesWithProperties;
};

export const getAnalysisById = async (analysisId: string) => {
  const analysis = await tablesDB.getRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "analyses",
    rowId: analysisId,
  });

  if (!analysis) {
    return null;
  }

  const properties = ["comments", "issues", "functions", "variables"];
  const propertiesData: Record<string, unknown[]> = {};

  for (const property of properties) {
    propertiesData[property] = await getAnalysisProperty(property, analysisId);
  }

  return {
    id: analysis.$id,
    userId: analysis.userId,
    fileName: analysis.fileName,
    fileType: analysis.fileType,
    code: analysis.code,
    createdAt: analysis.$createdAt,
    updatedAt: analysis.$updatedAt,
    ...propertiesData,
  };
};

async function getAnalysisProperty(tableId: string, analysisId: string) {
  const properties = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId,
    queries: [Query.equal("analysisId", analysisId)],
  });

  return properties.rows.map((property) => ({
    id: property.$id,
    ...property,
  }));
}
