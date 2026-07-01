import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { account, ID } from "@/lib/appwrite";
import { createUser, getUserWithEmail } from "@/lib/db";
import { toast } from "sonner";

type Role = "student" | "instructor";

type FormValues = {
  fullName: string;
  role: Role;
  email: string;
  password: string;
  passwordConfirmation: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  fullName: "",
  role: "instructor",
  email: "",
  password: "",
  passwordConfirmation: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidRole = useMemo(() => {
    return form.role === "student" || form.role === "instructor";
  }, [form.role]);

  const validate = (values: FormValues): FormErrors => {
    const validationErrors: FormErrors = {};

    if (!values.fullName.trim()) {
      validationErrors.fullName = "Full name is required";
    } else if (values.fullName.trim().length < 5) {
      validationErrors.fullName = "Full name must be at least 5 characters";
    }

    if (!isValidRole) {
      validationErrors.role = "Please select a valid role";
    }

    if (!values.email.trim()) {
      validationErrors.email = "Email is required";
    } else if (!emailRegex.test(values.email.trim())) {
      validationErrors.email = "Please enter a valid email";
    }

    if (!values.password) {
      validationErrors.password = "Password is required";
    } else if (values.password.length < 8) {
      validationErrors.password = "Password must be at least 8 characters";
    }

    if (!values.passwordConfirmation) {
      validationErrors.passwordConfirmation = "Please confirm your password";
    } else if (values.password !== values.passwordConfirmation) {
      validationErrors.passwordConfirmation = "Passwords do not match";
    }

    return validationErrors;
  };

  const updateField = <K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the errors in the form");
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    const fullName = form.fullName.trim();

    setIsSubmitting(true);

    try {
      const existingUser = await getUserWithEmail(normalizedEmail);
      if (existingUser) {
        setErrors((prev) => ({
          ...prev,
          email: "Email is already registered",
        }));
        toast.error("Email is already registered");
        return;
      }

      const newlyCreatedUser = await account.create(
        ID.unique(),
        normalizedEmail,
        form.password,
        fullName,
      );

      await createUser({
        id: newlyCreatedUser.$id,
        name: fullName,
        email: normalizedEmail,
        role: form.role,
      });

      await account.createEmailPasswordSession(normalizedEmail, form.password);

      await account.createVerification(
        `${import.meta.env.VITE_DOMAIN_NAME}/verify`, // redirect URL
      );

      await account.deleteSession("current");

      setForm(initialValues);
      setErrors({});
      toast.success("Verification email sent. Please check your email.");
      navigate("/login");
    } catch (e) {
      console.log(e);
      toast.error("Unable to register right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="bg-background-light shadow w-full max-w-md p-8 rounded-xl">
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John C. Doe"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
              />
              {errors.fullName ? (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">{errors.email}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">Confirm Password</Label>
              <Input
                id="passwordConfirmation"
                type="password"
                placeholder="Confirm your password"
                value={form.passwordConfirmation}
                onChange={(e) =>
                  updateField("passwordConfirmation", e.target.value)
                }
              />
              {errors.passwordConfirmation ? (
                <p className="text-sm text-destructive">
                  {errors.passwordConfirmation}
                </p>
              ) : null}
            </div>

            <div className="pt-2">
              <Button
                size="lg"
                className="w-full reflective-primary rounded-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Register"}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-foreground underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
