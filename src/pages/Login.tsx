import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { account } from "@/lib/appwrite";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/authContext";
import { getUserWithEmail } from "@/lib/db";
import InputField from "@/components/InputField";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { authUser, setAuthUser } = useAuthContext();
  const loggedInUser = authUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userInfo = await getUserWithEmail(email);

    if (!userInfo) {
      toast.error("User not found");
      return;
    }

    if (userInfo.role !== "instructor") {
      toast.error("Unauthorized");
      return;
    }

    await account.createEmailPasswordSession(email, password);

    setAuthUser({
      $id: userInfo.$id,
      name: userInfo.name,
      email: userInfo.email,
      role: userInfo.role,
      $updatedAt: userInfo.$updatedAt,
      $createdAt: userInfo.$createdAt,
    } as User);

    setEmail("");
    setPassword("");
    toast.success("Logged in successfully");
  };

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center flex-col space-y-8">
      <p>
        {loggedInUser ? `Logged in as ${loggedInUser.name}` : "Not logged in"}
      </p>
      <Card className="px-4 py-8 w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Archone</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mt-4 space-y-4">
              <InputField
                label={"Email"}
                htmlFor={"email"}
                type={"email"}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <InputField
                label={"Password"}
                htmlFor={"password"}
                type={"password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="mt-6">
              <Button size="lg" className="w-full ">
                Sign In
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
