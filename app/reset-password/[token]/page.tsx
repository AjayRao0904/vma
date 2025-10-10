"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-reset-token?token=${token}`);
        const data = await response.json();
        setIsValidToken(data.valid);
        if (!data.valid) {
          setError(data.error || "Invalid or expired reset link");
        }
      } catch (error) {
        setIsValidToken(false);
        setError("Failed to verify reset link");
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
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

        {/* Reset Password Form Card */}
        <div className="w-1/4 h-full bg-transparent flex items-center justify-center rounded-lg">
          <div className="w-full max-w-[500px] px-8">
            {isValidToken === null ? (
              // Loading state
              <div className="text-center">
                <p className="text-white text-lg">Verifying reset link...</p>
              </div>
            ) : isValidToken === false ? (
              // Invalid token
              <div className="flex flex-col gap-6 text-center">
                <h1 className="text-white font-medium text-3xl">Invalid Link</h1>
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-[#367AFF] hover:underline font-medium"
                >
                  Request a new reset link
                </Link>
              </div>
            ) : (
              // Valid token - show form
              <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex flex-col gap-3">
                  <h1 className="text-white font-medium text-3xl md:text-4xl leading-[1.28] text-center">
                    Reset Password
                  </h1>
                  <p className="text-[#969696] font-normal text-lg leading-[1.32] text-center">
                    Enter your new password below.
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
                      Password reset successful! Redirecting to login...
                    </p>
                  </div>
                )}

                {/* Form Fields */}
                <div className="flex flex-col gap-5">
                  {/* Password Input */}
                  <div className="relative">
                    <div className="flex items-center justify-between gap-2 p-4 border border-[#D9D9D9] rounded-[10px] bg-transparent">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="New Password"
                        className="flex-1 bg-transparent text-white placeholder-[#9A9A9A] font-normal text-lg outline-none"
                        required
                        disabled={isLoading || success}
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
                    <div className="absolute -top-2.5 left-3 bg-black px-1">
                      <span className="text-[#D9D9D9] text-sm font-normal">New Password</span>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="relative">
                    <div className="flex items-center justify-between gap-2 p-4 border border-[#D9D9D9] rounded-[10px] bg-transparent">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm New Password"
                        className="flex-1 bg-transparent text-white placeholder-[#9A9A9A] font-normal text-lg outline-none"
                        required
                        disabled={isLoading || success}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
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
                    <div className="absolute -top-2.5 left-3 bg-black px-1">
                      <span className="text-[#D9D9D9] text-sm font-normal">Confirm Password</span>
                    </div>
                  </div>

                  {/* Password Requirements */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-[#969696] text-xs mb-2">Password must contain:</p>
                    <ul className="text-[#969696] text-xs space-y-1">
                      <li>• At least 8 characters</li>
                      <li>• One uppercase letter</li>
                      <li>• One lowercase letter</li>
                      <li>• One number</li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || success}
                    className="w-full bg-[#367AFF] text-white font-semibold text-base py-3 rounded-[10px] hover:bg-[#2856CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Resetting..." : success ? "Success!" : "Reset Password"}
                  </button>
                </div>

                {/* Back to Login Link */}
                <div className="text-center">
                  <Link href="/login" className="text-[#969696] text-lg font-light hover:text-white">
                    Back to{" "}
                    <span className="text-[#367AFF] hover:underline font-medium">
                      Sign in
                    </span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
