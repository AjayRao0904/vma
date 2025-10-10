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
