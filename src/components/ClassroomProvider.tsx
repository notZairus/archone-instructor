import { useEffect, useState } from "react";
import { classroomContext } from "../contexts/classroomContext";
import { useAuthContext } from "@/contexts/authContext";
import type { Classroom } from "@/types/global";
import { getClassroomsByUserId } from "@/lib/db";

const ClassroomProvider = ({ children }: { children: React.ReactNode }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const { authUser } = useAuthContext();

  useEffect(() => {
    if (!authUser) {
      setClassrooms([]);
      return;
    }

    const fetchClassrooms = async () => {
      try {
        const res = await getClassroomsByUserId(authUser.$id);

        setClassrooms(res);
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
