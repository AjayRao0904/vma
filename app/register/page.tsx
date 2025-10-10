"use client";

// REGISTRATION DISABLED - Email/password registration disabled until Resend domain is verified
// User should use Google Sign In only

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
  const router = useRouter();

  // Redirect to login page since registration is disabled
  useEffect(() => {
    router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-white text-2xl mb-4">Redirecting to login...</h1>
        <p className="text-white/60">Registration is temporarily disabled. Please use Google Sign In.</p>
      </div>
    </div>
  );
}
