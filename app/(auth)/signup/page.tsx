"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, SignUpSchema } from "@/lib/validations/auth";
import { signUp } from "@/lib/actions/auth";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/lib/actions/auth";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction] = useFormState<FormState, FormData>(signUp, {
    errors: undefined,
    message: undefined,
  });

  const {
    register,
    handleSubmit,
    formState: { errors: clientErrors },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
  });

  const emailError = clientErrors.email?.message || state.errors?.email?.[0];
  const passwordError = clientErrors.password?.message || state.errors?.password?.[0];
  const fullNameError = clientErrors.fullName?.message || state.errors?.fullName?.[0];
  const orgNameError = clientErrors.orgName?.message || state.errors?.orgName?.[0];
  const formError = state.errors?._form?.[0];

  useEffect(() => {
    if (state.message) {
      toast({ title: "Success", description: state.message });
      router.push("/login");
    }
  }, [state, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign Up</h1>
          <p className="text-muted-foreground">
            Enter your information to create an account
          </p>
        </div>

        {formError && (
          <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20">
            {formError}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="John Doe"
              required
              {...register("fullName")}
            />
            {fullNameError && (
              <p className="text-sm font-medium text-destructive">
                {fullNameError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              name="orgName"
              type="text"
              placeholder="Acme Corp"
              required
              {...register("orgName")}
            />
            {orgNameError && (
              <p className="text-sm font-medium text-destructive">
                {orgNameError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              {...register("email")}
            />
            {emailError && (
              <p className="text-sm font-medium text-destructive">
                {emailError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {passwordError && (
              <p className="text-sm font-medium text-destructive">
                {passwordError}
              </p>
            )}
          </div>

          <SubmitButton />

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline hover:text-primary">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing Up...
        </>
      ) : (
        "Sign Up"
      )}
    </Button>
  );
}
