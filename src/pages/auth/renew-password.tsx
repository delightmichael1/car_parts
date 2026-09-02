"use client";

import { Suspense, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Input,
  Button,
  FieldError,
  Label,
  TextField,
  toast,
} from "@heroui/react";
import { RiLockLine, RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/layout/AuthLayout";
import { useAxios } from "@/hooks/useAxios";

const schema = Yup.object({
  password: Yup.string()
    .min(6, "At least 6 characters")
    .required("New password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords don't match")
    .required("Confirm your new password"),
});

function RenewPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { axios } = useAxios();
  const email = searchParams.get("email") ?? "";
  const otp = searchParams.get("otp") ?? "";

  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: { password: "", confirmPassword: "" },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await axios.post("/user/reset-password", {
          email,
          otp,
          password: values.password,
        });
        toast.success("Password updated", {
          description: "Sign in with your new password",
        });
        router.replace("/auth/signin");
      } catch (error: any) {
        toast.danger("Couldn't update your password", {
          description:
            error?.response?.data?.message || "Try requesting a new code",
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <AuthLayout>
      <h2 className="mt-1 text-3xl font-bold text-black">Set a new password</h2>
      <p className="mt-2 text-sm text-gray-500">
        Choose a password you haven't used before on this account.
      </p>

      <form onSubmit={formik.handleSubmit} className="mt-8 flex flex-col gap-4">
        <TextField
          isInvalid={!!(formik.touched.password && formik.errors.password)}
        >
          <Label htmlFor="password" className="text-black">
            New password
          </Label>
          <div className="relative">
            <RiLockLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-400" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter a new password"
              className="pl-9 pr-10"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 flex items-center justify-center"
            >
              {showPassword ? (
                <RiEyeOffLine className="h-4 w-4 text-black-400" />
              ) : (
                <RiEyeLine className="h-4 w-4 text-black-400" />
              )}
            </button>
          </div>
          {formik.touched.password && formik.errors.password ? (
            <FieldError>{formik.errors.password}</FieldError>
          ) : null}
        </TextField>

        <TextField
          isInvalid={
            !!(formik.touched.confirmPassword && formik.errors.confirmPassword)
          }
        >
          <Label htmlFor="confirmPassword" className="text-black">
            Confirm password
          </Label>
          <div className="relative">
            <RiLockLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-400" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter the new password"
              className="pl-9"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </div>
          {formik.touched.confirmPassword && formik.errors.confirmPassword ? (
            <FieldError>{formik.errors.confirmPassword}</FieldError>
          ) : null}
        </TextField>

        <Button
          type="submit"
          className="mt-2 h-12 w-full bg-black font-medium text-white"
          isPending={formik.isSubmitting}
        >
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}

function RenewPasswordPage() {
  return (
    <Suspense fallback={null}>
      <RenewPasswordForm />
    </Suspense>
  );
}

export default RenewPasswordPage;
