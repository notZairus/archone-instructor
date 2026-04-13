import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { account, tablesDB } from "@/lib/appwrite";
import { Query } from "appwrite";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/authContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { authUser, setAuthUser } = useAuthContext();
  const loggedInUser = authUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await tablesDB.listRows({
      databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
      tableId: "users",
      queries: [Query.equal("email", email), Query.limit(1)],
    });

    setEmail("");
    setPassword("");

    const userInfo = result.rows[0] || null;

    if (!userInfo) {
      toast.error("User not found");
      return;
    }

    if (userInfo.role !== "instructor") {
      toast.error("Unauthorized");
      return;
    }

    const user = await account.createEmailPasswordSession(email, password);

    console.log(user);
    setAuthUser({
      $id: userInfo.$id,
      name: userInfo.name,
      email: userInfo.email,
      role: userInfo.role,
      $updatedAt: userInfo.$updatedAt,
      $createdAt: userInfo.$createdAt,
    } as User);
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

const InputField = ({
  label = "Label",
  htmlFor = "",
  type = "text",
  placeholder = "",
  value,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Input
        id={htmlFor}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default Login;
