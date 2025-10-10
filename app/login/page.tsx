"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  // COMMENTED OUT - Email/Password login disabled until Resend domain is verified
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  // const [showPassword, setShowPassword] = useState(false);
  // const [error, setError] = useState("");
  // const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // COMMENTED OUT - Email/Password login handler
  /*
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error signing in:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  */

  const handleGoogleSignIn = async () => {
    try {
      const result = await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
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

        {/* Login Form Card */}
        <div className="w-1/4 h-full bg-transparent flex items-center justify-center rounded-lg">
          <div className="w-full max-w-[500px] px-8">
            <div className="flex flex-col gap-8">
              {/* Header */}
              <div className="flex flex-col gap-3">
                <h1 className="text-white font-medium text-3xl md:text-4xl leading-[1.28] text-center">
                  Sign in
                </h1>
                <p className="text-[#969696] font-normal text-lg leading-[1.32] text-center">
                  Please login to continue to your account.
                </p>
              </div>

              {/* Email/Password Login - COMMENTED OUT until Resend domain is verified */}
              {/*
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-200 text-sm text-center">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-5">
                <div className="relative">
                  <div className="flex items-center gap-1 p-4 border-[1.5px] border-[#367AFF] rounded-[10px] bg-transparent">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-transparent text-white font-normal text-lg outline-none"
                      placeholder="abc@example.com"
                      required
                    />
                  </div>
                  <div className="absolute -top-2.5 left-3 bg-black px-1">
                    <span className="text-[#367AFF] text-sm font-normal">Email</span>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between gap-2 p-4 border border-[#D9D9D9] rounded-[10px] bg-transparent">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="flex-1 bg-transparent text-white placeholder-[#9A9A9A] font-normal text-lg outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-[#367AFF] text-sm hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#367AFF] text-white font-semibold text-base py-3 rounded-[10px] hover:bg-[#2856CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[#D9D9D9]"></div>
                  <span className="text-[#6E6E6E] text-base font-normal px-2">or</span>
                  <div className="flex-1 h-px bg-[#D9D9D9]"></div>
                </div>
              </div>
              */}

              {/* Form Fields */}
              <div className="flex flex-col gap-5">

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white border border-[#E6E8E7] text-[#1F1F1F] font-semibold text-base py-3 rounded-[10px] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </button>
              </div>

              {/* Create Account Link - COMMENTED OUT */}
              {/*
              <div className="text-center">
                <p className="text-[#969696] text-lg font-light">
                  Need an account?{" "}
                  <Link href="/register" className="text-[#367AFF] hover:underline font-medium">
                    Create one
                  </Link>
                </p>
              </div>
              */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
