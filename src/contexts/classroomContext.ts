import React, { createContext, useContext } from "react";

export type initialClassroomContext = {
  classrooms: Classroom[];
  setClassrooms: React.Dispatch<React.SetStateAction<Classroom[]>>;
};

export const classroomContext = createContext<initialClassroomContext | null>(
  null,
);

export const useClassroomContext = () => {
  const ctx = useContext(classroomContext);
  if (!ctx) {
    throw new Error("Classroom context is used outside of it's provider.");
  }
  return ctx;
};
