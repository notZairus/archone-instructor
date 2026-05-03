import { useState } from "react";
import { account } from "@/lib/appwrite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUserById, verifyUserById } from "@/lib/db";
import { useSearchParams } from "react-router";

type VerificationStatus = "idle" | "loading" | "success" | "error";

const Verify = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [message, setMessage] = useState("Verifying your email...");
  const [role, setRole] = useState<"student" | "instructor" | null>(null);

  const runVerification = async () => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    if (!userId || !secret) {
      setStatus("error");
      setMessage("Invalid verification link. Please request a new one.");
      return;
    }

    setStatus("loading");

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

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md px-4 py-6">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Verify Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "idle" && (
            <Button size="lg" className="w-full" onClick={runVerification}>
              Verify
            </Button>
          )}

          {status === "loading" && (
            <p className="text-center text-muted-foreground">{message}</p>
          )}

          {status === "success" && (
            <p className="text-center text-green-500">
              {role === "instructor"
                ? "You are now verified as an instructor. You can sign in to the ArcHone Web Dashboard."
                : "Email verified successfully. You can now sign in on ArcHone CLI."}
            </p>
          )}

          {status === "error" && (
            <p className="text-center text-red-500">{message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Verify;
