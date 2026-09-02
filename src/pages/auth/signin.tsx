"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Input,
  Button,
  Label,
  FieldError,
  TextField,
  toast,
} from "@heroui/react";
import { RiLockLine, RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { useRouter } from "next/navigation";
import AuthLayout from "@/layout/AuthLayout";
import { useAxios } from "@/hooks/useAxios";
import useSessionTokens from "@/hooks/useSessionTokens";
import useDashboardStore from "@/stores/useDashboardStore";

const schema = Yup.object({
  email: Yup.string()
    .email("Enter a valid email")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
});

function SigninPage() {
  const router = useRouter();
  const { axios } = useAxios();
  const { addTokens } = useSessionTokens();
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const { data } = await axios.post("/user/signin", values);
        addTokens(data.accessToken, data.refreshToken);
        useDashboardStore.setState({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        router.replace("/");
      } catch (error: any) {
        const message =
          error?.response?.status === 403
            ? "This account has been suspended"
            : error?.response?.data?.message || "Invalid email or password";
        toast.danger("Couldn't sign in", {
          description: message,
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <AuthLayout>
      <p className="text-sm">Welcome back</p>
      <h2 className="mt-1 text-3xl font-bold text-black">
        Sign in to your workspace
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        Pick up where you left off - catalog, sales, and quotations, all in one
        place.
      </p>

      <form onSubmit={formik.handleSubmit} className="mt-8 flex flex-col gap-4">
        <TextField isInvalid={!!(formik.touched.email && formik.errors.email)}>
          <div className="mb-1.5 flex items-center gap-2">
            <Label htmlFor="email" className="text-black">
              Work email
            </Label>
            <span className="text-sm">*</span>
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@business.co.zw"
            className="w-full py-3 px-3"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
          {formik.touched.email && formik.errors.email ? (
            <FieldError>{formik.errors.email}</FieldError>
          ) : null}
        </TextField>

        <TextField
          isInvalid={!!(formik.touched.password && formik.errors.password)}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="text-black">
              Password
            </Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium hover:text-black"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pr-10 w-full  py-3 px-3"
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

        <Button
          type="submit"
          className="mt-2 h-12 w-full bg-black font-medium text-white"
          isPending={formik.isSubmitting}
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 flex items-center gap-1 text-xs text-black-400">
        <RiLockLine className="h-3.5 w-3.5" />
        Secure sign-in
      </p>
    </AuthLayout>
  );
}

export default SigninPage;
