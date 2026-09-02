"use client";

import Link from "next/link";
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
import { RiMailLine, RiArrowLeftLine } from "react-icons/ri";
import { useRouter } from "next/navigation";
import AuthLayout from "@/layout/AuthLayout";
import { useAxios } from "@/hooks/useAxios";

const schema = Yup.object({
  email: Yup.string()
    .email("Enter a valid email")
    .required("Email is required"),
});

function ForgotPasswordPage() {
  const router = useRouter();
  const { axios } = useAxios();

  const formik = useFormik({
    initialValues: { email: "" },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await axios.post("/user/initiate-reset-password", values);
        toast.success("Check your email", {
          description: `We've sent a code to ${values.email}`,
        });
        router.push(
          `/auth/forgot-password-otp?email=${encodeURIComponent(values.email)}`,
        );
      } catch (error: any) {
        toast.danger("Couldn't send the code", {
          description:
            error?.response?.data?.message || "Try again in a moment",
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <AuthLayout>
      <Link
        href="/auth/signin"
        className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-black-400 hover:text-black"
      >
        <RiArrowLeftLine className="h-3.5 w-3.5" />
        Back to sign in
      </Link>

      <h2 className="mt-1 text-3xl font-bold text-black">
        Reset your password
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        Enter the email on your account and we'll send a 6-digit code to verify
        it's you.
      </p>

      <form onSubmit={formik.handleSubmit} className="mt-8 flex flex-col gap-4">
        <TextField isInvalid={!!(formik.touched.email && formik.errors.email)}>
          <Label htmlFor="email" className="text-black">
            Work email
          </Label>
          <div className="relative">
            <RiMailLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-400" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@business.co.zw"
              className="pl-9 w-full py-3 px-3"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </div>
          {formik.touched.email && formik.errors.email ? (
            <FieldError>{formik.errors.email}</FieldError>
          ) : null}
        </TextField>

        <Button
          type="submit"
          className="mt-2 h-12 w-full bg-black font-medium text-white"
          isPending={formik.isSubmitting}
        >
          Send reset code
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
