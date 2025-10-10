"use client";

// FORGOT PASSWORD DISABLED - Email functionality disabled until Resend domain is verified

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-white text-2xl mb-4">Redirecting...</h1>
        <p className="text-white/60">Password reset is temporarily disabled. Please use Google Sign In.</p>
      </div>
    </div>
  );
}

/*
// ORIGINAL FORGOT PASSWORD - COMMENTED OUT

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPageOriginal() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send reset email");
      } else {
        setSuccess(true);
        setEmail("");
      }
    } catch (error) {
      console.error("Error sending reset email:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex p-4">
      <div className="flex w-full gap-4">
        {/* Orange Card */}
        <div className="w-3/4 h-full orange-gradient relative overflow-hidden rounded-lg">
          <div className="absolute inset-0 flex flex-col items-center justify-end gap-6 px-6 pb-16">
            {/* Logo */}
            <div className="w-full max-w-[300px] h-[100px] relative flex items-center justify-center">
              <img
                src="/aalap_logo.svg"
                alt="Aalap Logo"
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* Forgot Password Form Card */}
        <div className="w-1/4 h-full bg-transparent flex items-center justify-center rounded-lg">
          <div className="w-full max-w-[500px] px-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              {/* Header */}
              <div className="flex flex-col gap-3">
                <h1 className="text-white font-medium text-3xl md:text-4xl leading-[1.28] text-center">
                  Forgot Password
                </h1>
                <p className="text-[#969696] font-normal text-lg leading-[1.32] text-center">
                  Enter your email to receive a password reset link.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-200 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                  <p className="text-green-200 text-sm text-center">
                    Password reset link sent! Check your email.
                  </p>
                </div>
              )}

              {/* Form Fields */}
              <div className="flex flex-col gap-5">
                {/* Email Input */}
                <div className="relative">
                  <div className="flex items-center gap-1 p-4 border-[1.5px] border-[#367AFF] rounded-[10px] bg-transparent">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-transparent text-white font-normal text-lg outline-none"
                      placeholder="abc@example.com"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="absolute -top-2.5 left-3 bg-black px-1">
                    <span className="text-[#367AFF] text-sm font-normal">Email</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#367AFF] text-white font-semibold text-base py-3 rounded-[10px] hover:bg-[#2856CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>

              {/* Back to Login Link */}
              <div className="text-center">
                <p className="text-[#969696] text-lg font-light">
                  Remember your password?{" "}
                  <Link href="/login" className="text-[#367AFF] hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
