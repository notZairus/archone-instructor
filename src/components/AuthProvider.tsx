import { useEffect, useState } from "react";
import { authContext } from "@/contexts/authContext";
import { account } from "@/lib/appwrite";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await account.get();
        setAuthUser(user);
      } catch {
        setAuthUser(null);
      }
    };

    fetchUser();
  }, []);

  return (
    <authContext.Provider value={{ authUser, setAuthUser }}>
      {children}
    </authContext.Provider>
  );
};

export default AuthProvider;
