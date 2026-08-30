import { Button } from "@/components/ui/button";
import { useState } from "react";
import { account } from "@/lib/appwrite";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/authContext";
import { getUserWithEmail } from "@/lib/db";
import InputField from "@/components/InputField";
import { Link } from "react-router";
import type { ChangeEvent } from "react";
import { Separator } from "@/components/ui/separator";
import archone_logo from "@/assets/images/archone_logo.webp";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setAuthUser } = useAuthContext();

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

    if (userInfo.status !== "verified") {
      toast.error("Please verify your email before logging in");
      return;
    }

    try {
      await account.createEmailPasswordSession(email, password);
    } catch {
      toast.error("Invalid credentials");
      return;
    }

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
      <div className="w-full bg-card border max-w-md p-8 pt-4 rounded-xl">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16">
            <img
              src={archone_logo}
              alt="ArcHone Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="font-bold text-3xl">ArcHone</p>
        </div>
        <Separator className="my-4" />
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <InputField
              label={"Email"}
              htmlFor={"email"}
              type={"email"}
              placeholder="example@email.com"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
            />

            <InputField
              label={"Password"}
              htmlFor={"password"}
              type={"password"}
              placeholder="mypassword123"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
            />
          </div>

          <div className="mt-6">
            <Button className="reflective-primary w-full rounded-lg">
              Sign In
            </Button>
          </div>

          <p className="mt-4 text-center text-[0.7rem] text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-foreground underline"
            >
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
