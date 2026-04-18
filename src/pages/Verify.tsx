import { useEffect, useState } from "react";
import { Link } from "react-router";
import { account } from "@/lib/appwrite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUserById, verifyUserById } from "@/lib/db";

type VerificationStatus = "loading" | "success" | "error";

const Verify = () => {
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const [role, setRole] = useState<"student" | "instructor" | null>(null);

  useEffect(() => {
    const runVerification = async () => {
      const params = new URLSearchParams(window.location.search);
      const userId = params.get("userId");
      const secret = params.get("secret");

      if (!userId || !secret) {
        setStatus("error");
        setMessage("Invalid verification link. Please request a new one.");
        return;
      }

      try {
        await account.updateVerification(userId, secret);
        await verifyUserById(userId);

        const verifiedUser = await getUserById(userId);

        if (!verifiedUser) {
          setStatus("error");
          setMessage("User not found. Please contact support.");
          return;
        }

        setRole(verifiedUser.role);

        if (verifiedUser.role === "instructor") {
          setStatus("success");
          setMessage("Email verified successfully. You can now sign in.");
          toast.success("Email verified successfully");
          return;
        }

        setStatus("success");
        setMessage(
          "Email verified successfully. You can now sign in on Archone CLI.",
        );
        toast.success("Email verified successfully");
      } catch {
        setStatus("error");
        setMessage("Verification failed or link has expired.");
        toast.error("Verification failed");
      }
    };

    void runVerification();
  }, []);

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md px-4 py-6">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Verify Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">{message}</p>

          {status === "loading" ? (
            <p className="text-center text-sm">Please wait...</p>
          ) : role === "student" ? (
            <p className="text-center text-sm">
              
              Go back to to your terminal and start using Archone CLI.
            </p>
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link to="/login">Go To Sign In</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Verify;
