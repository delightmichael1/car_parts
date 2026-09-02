"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { InputOTP, Button, toast } from "@heroui/react";
import { RiArrowLeftLine } from "react-icons/ri";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/layout/AuthLayout";
import { useAxios } from "@/hooks/useAxios";

function ForgotPasswordOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { axios } = useAxios();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const verify = async () => {
    if (otp.length !== 6) return;
    setIsSubmitting(true);
    try {
      await axios.post("/user/validate-otp", { email, otp });
      router.push(
        `/auth/renew-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
      );
    } catch (error: any) {
      toast.danger("That code didn't work", {
        description:
          error?.response?.data?.message || "Check the code and try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    setIsResending(true);
    try {
      await axios.post("/user/initiate-reset-password", { email });
      toast.success("Code resent", {
        description: `Sent a new code to ${email}`,
      });
    } catch {
      toast.danger("Couldn't resend the code", {
        description: "Try again shortly",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <Link
        href="/auth/forgot-password"
        className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-black-400 hover:text-black"
      >
        <RiArrowLeftLine className="h-3.5 w-3.5" />
        Back
      </Link>

      <h2 className="mt-1 text-3xl font-bold text-black">Enter the code</h2>
      <p className="mt-2 text-sm text-gray-500">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-black">{email || "your email"}</span>.
        It expires shortly, so enter it soon.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          aria-label="Verification code"
          inputMode="numeric"
          pattern="[0-9]*"
        >
          <InputOTP.Group>
            {[...Array(6)].map((_, index) => (
              <InputOTP.Slot key={index} index={index} />
            ))}
          </InputOTP.Group>
        </InputOTP>

        <Button
          onPress={verify}
          isDisabled={otp.length !== 6}
          isPending={isSubmitting}
          className="mt-2 h-12 w-full bg-black font-medium text-white"
        >
          Verify code
        </Button>

        <p className="text-center text-xs text-gray-500">
          Didn't get it?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={isResending}
            className="font-medium text-black hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}

function ForgotPasswordOtpPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordOtpForm />
    </Suspense>
  );
}

export default ForgotPasswordOtpPage;
