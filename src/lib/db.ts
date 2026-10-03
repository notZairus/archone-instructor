import { tablesDB } from "./appwrite";
import { Query, ID } from "appwrite";
import type { Classroom, Student, Issue } from "@/types/global";
import { removeDuplicatedIssues } from "./helpers";

const MAX_ROWS = 100;

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

export const createFolder = async ({
  name,
  description,
  targetFileNamePrefix,
  classroomId,
}: {
  name: string;
  description?: string;
  targetFileNamePrefix: string;
  classroomId: string;
}) => {
  return tablesDB.createRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "6aba1d8e001377a01819",
    rowId: ID.unique(),
    data: {
      name,
      description,
      targetFileNamePrefix,
      classroomId,
    },
  });
};

export const getFolders = async () => {
  const result = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "6aba1d8e001377a01819",
    queries: [Query.limit(MAX_ROWS), Query.orderDesc("$createdAt")],
  });

  return result.rows;
};

export const getFoldersByClassroomId = async (classroomId: string) => {
  const result = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "6aba1d8e001377a01819",
    queries: [
      Query.equal("classroomId", classroomId),
      Query.limit(MAX_ROWS),
      Query.orderDesc("$createdAt"),
    ],
  });

  return result.rows;
};

export const updateFolder = async (
  folderId: string,
  data: {
    name: string;
    description: string;
    targetFileNamePrefix: string;
  },
) => {
  return tablesDB.updateRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "6aba1d8e001377a01819",
    rowId: folderId,
    data,
  });
};

export const deleteFolder = async (folderId: string) => {
  return tablesDB.deleteRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "6aba1d8e001377a01819",
    rowId: folderId,
  });
};

export const getClassroomsByUserId = async (userId: string) => {
  const result = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "classrooms",
    queries: [Query.equal("userId", userId), Query.limit(MAX_ROWS)],
  });

  return result.rows as unknown as Classroom[];
};

export const getClassroomStudents = async (classroomId: string) => {
  const result = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "classroom_user",
    queries: [Query.equal("classroomId", classroomId), Query.limit(MAX_ROWS)],
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

export const getUserAnalyses = async (userId: string, order = "desc") => {
  const analyses = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "analyses",
    queries: [
      Query.equal("userId", userId),
      Query.limit(MAX_ROWS),
      order === "asc"
        ? Query.orderAsc("$createdAt")
        : Query.orderDesc("$createdAt"),
    ],
  });

  const formattedAnalyses = analyses.rows.map((analysis) => ({
    id: analysis.$id,
    fileName: analysis.fileName,
    fileType: analysis.fileType,
    userId: analysis.userId,
    code: analysis.code,
    mode: analysis.mode,
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

      const issues: Issue[] = propertiesData.issues as Issue[];

      const filteredIssues = removeDuplicatedIssues(issues);

      const cleanPropertiesData = {
        ...propertiesData,
        issues: filteredIssues,
      };

      return {
        ...analysis,
        ...cleanPropertiesData,
      };
    }),
  );

  return formattedAnalysesWithProperties;
};

export const getUserAnalysesWithoutComplexity = async (userId: string) => {
  const analyses = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "analyses",
    queries: [
      Query.equal("userId", userId),
      Query.limit(MAX_ROWS),
      Query.notEqual("mode", "complexity"),
    ],
  });

  const formattedAnalyses = analyses.rows.map((analysis) => ({
    id: analysis.$id,
    fileName: analysis.fileName,
    fileType: analysis.fileType,
    userId: analysis.userId,
    code: analysis.code,
    mode: analysis.mode,
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

      const issues: Issue[] = propertiesData.issues as Issue[];

      const filteredIssues = removeDuplicatedIssues(issues);

      const cleanPropertiesData = {
        ...propertiesData,
        issues: filteredIssues,
      };

      return {
        ...analysis,
        ...cleanPropertiesData,
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

  if (analysis.mode === "complexity") {
    const functions = await tablesDB.listRows({
      databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
      tableId: "complexities",
      queries: [Query.equal("analysisId", analysisId), Query.limit(MAX_ROWS)],
    });

    const fnWithTimeSpaceComplexity = await Promise.all(
      functions.rows.map(async (func) => {
        const functionId = func.$id;

        const timeComp = await tablesDB.listRows({
          databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
          tableId: "tcomplexities",
          queries: [
            Query.equal("complexityId", functionId),
            Query.limit(MAX_ROWS),
          ],
        });

        const spaceComp = await tablesDB.listRows({
          databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
          tableId: "scomplexities",
          queries: [
            Query.equal("complexityId", functionId),
            Query.limit(MAX_ROWS),
          ],
        });

        return {
          ...func,
          space: spaceComp.rows[0],
          time: timeComp.rows[0],
        };
      }),
    );

    return {
      $id: analysis.$id,
      id: analysis.$id,
      userId: analysis.userId,
      fileName: analysis.fileName,
      fileType: analysis.fileType,
      code: analysis.code,
      mode: analysis.mode,
      createdAt: analysis.$createdAt,
      updatedAt: analysis.$updatedAt,
      complexitySummary: {
        functions: fnWithTimeSpaceComplexity,
      },
    };
  } else {
    const properties = ["comments", "issues", "functions", "variables"];
    const propertiesData: Record<string, unknown[]> = {};

    for (const property of properties) {
      propertiesData[property] = await getAnalysisProperty(
        property,
        analysisId,
      );
    }

    const issues = propertiesData.issues;

    const filteredIssues = removeDuplicatedIssues(issues as Issue[]);

    const _propertiesDataWithFilteredIssues = {
      ...propertiesData,
      issues: filteredIssues,
    };

    const formattedAnalysis = {
      $id: analysis.$id,
      id: analysis.$id,
      userId: analysis.userId,
      fileName: analysis.fileName,
      fileType: analysis.fileType,
      code: analysis.code,
      mode: analysis.mode,
      createdAt: analysis.$createdAt,
      updatedAt: analysis.$updatedAt,
      ..._propertiesDataWithFilteredIssues,
    };

    return formattedAnalysis;
  }
};

export const sendFeedback = async (data: {
  analysisId: string;
  fileName: string;
  instructorId: string;
  studentId: string;
  message: string;
  highlightedCode: string;
}) => {
  await tablesDB.createRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "6a994862001659d9de4d",
    rowId: ID.unique(),
    data,
  });

  await tablesDB.updateRow({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId: "users",
    rowId: data.studentId,
    data: {
      notify: true,
    },
  });
};

export const getInstructorFeedback = async ({
  instructorId,
  analysisId,
  fileName,
}: {
  instructorId?: string;
  analysisId?: string;
  fileName?: string;
}) => {
  const feedbackRows = [];
  let offset = 0;

  while (true) {
    const result = await tablesDB.listRows({
      databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
      tableId: "6a994862001659d9de4d",
      queries: [
        Query.equal("instructorId", instructorId),
        ...(analysisId ? [Query.equal("analysisId", analysisId)] : []),
        ...(fileName ? [Query.equal("fileName", fileName)] : []),
        Query.orderDesc("$createdAt"),
        Query.limit(MAX_ROWS),
        Query.offset(offset),
      ],
    });

    feedbackRows.push(...result.rows);
    if (result.rows.length < MAX_ROWS) break;
    offset += MAX_ROWS;
  }

  return feedbackRows;
};

// HELPER /////////////////////////////////////////////////
// HELPER /////////////////////////////////////////////////
// HELPER /////////////////////////////////////////////////

async function getAnalysisProperty(tableId: string, analysisId: string) {
  const properties = await tablesDB.listRows({
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    tableId,
    queries: [Query.equal("analysisId", analysisId), Query.limit(MAX_ROWS)],
  });

  return properties.rows.map((property) => ({
    id: property.$id,
    ...property,
  }));
}
