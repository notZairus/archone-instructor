import { useEffect, useState } from "react";
import { classroomContext } from "../contexts/classroomContext";
import { useAuthContext } from "@/contexts/authContext";
import { tablesDB } from "@/lib/appwrite";
import { Query } from "appwrite";

const ClassroomProvider = ({ children }: { children: React.ReactNode }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const { authUser } = useAuthContext();

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await tablesDB.listRows({
          databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
          tableId: "classrooms",
          queries: [Query.equal("userId", authUser.$id)],
        });

        setClassrooms(res.rows as unknown as Classroom[]);
      } catch {
        return [];
      }
    };
    fetchClassrooms();
  }, [authUser]);

  return (
    <classroomContext.Provider value={{ classrooms, setClassrooms }}>
      {children}
    </classroomContext.Provider>
  );
};

export default ClassroomProvider;
