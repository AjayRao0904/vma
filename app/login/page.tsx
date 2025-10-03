"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("jonas_kahnwald@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      const result = await signIn("google", {
        callbackUrl: "/dashboard", // Redirect to dashboard after successful login
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
            <div className="w-full max-w-[300px] h-[100px] relative">
              <div className="text-orange-light font-normal text-2xl md:text-4xl lg:text-5xl leading-[1.5] tracking-[-0.08em] absolute left-[50px] top-[15px]">
                aalap.a
              </div>
              
              {/* Vector placeholder */}
              <div className="absolute left-0 top-[30px] w-[50px] h-[45px] bg-orange-light rounded-lg flex items-center justify-center">
                <span className="text-orange text-lg font-bold">A</span>
              </div>
              
              {/* Frame with I */}
              <div className="absolute left-[180px] top-[40px] w-[100px] h-[35px]">
                <div className="text-orange-light font-normal text-2xl md:text-3xl lg:text-4xl leading-[1.5] tracking-[-0.08em] absolute left-[60px] top-[-15px]">
                  I
                </div>
              </div>
              
              {/* Asterisk */}
              <div className="text-orange-light font-normal text-2xl md:text-4xl lg:text-5xl leading-[1.5] tracking-[-0.08em] absolute left-[250px] top-0">
                *
              </div>
            </div>
            
            {/* Description text */}
            <div className="w-full max-w-[320px] text-center">
              <p className="text-white/70 font-normal text-base md:text-lg leading-[1.32] text-center">
                At Aalap, we're making that possible:<br />
                fast, personal, and deeply human<br />
                in its emotional depth.
              </p>
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

              {/* Form */}
              <div className="flex flex-col gap-5">
                {/* Email Input */}
                <div className="relative">
                  <div className="flex items-center gap-1 p-4 border-[1.5px] border-[#367AFF] rounded-[10px] bg-transparent">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-transparent text-white font-normal text-lg outline-none"
                      placeholder="Email"
                    />
                    <span className="text-white text-lg font-light">|</span>
                  </div>
                  <div className="absolute -top-2.5 left-3 bg-black px-1">
                    <span className="text-[#367AFF] text-sm font-normal">Email</span>
                  </div>
                </div>

                {/* Password Input */}
                <div className="relative">
                  <div className="flex items-center justify-between gap-2 p-4 border border-[#D9D9D9] rounded-[10px] bg-transparent">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="flex-1 bg-transparent text-[#9A9A9A] font-normal text-lg outline-none"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="w-6 h-6 flex items-center justify-center"
                    >
                      <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
                        <path
                          d="M2 1L18 17M9.58 5.58C9.85 5.31 10.22 5.14 10.62 5.11C11.02 5.08 11.42 5.19 11.74 5.43C12.06 5.67 12.28 6.02 12.37 6.41C12.46 6.8 12.41 7.21 12.24 7.58M9.58 5.58L12.24 7.58M9.58 5.58L6.8 8.36C6.53 8.63 6.36 9 6.33 9.4C6.3 9.8 6.41 10.2 6.65 10.52C6.89 10.84 7.24 11.06 7.63 11.15C8.02 11.24 8.43 11.19 8.8 11.02L12.24 7.58M14.12 14.12L12.24 7.58"
                          stroke="#9A9A9A"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Keep me logged in */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsChecked(!isChecked)}
                    className="w-5 h-5 bg-white rounded-sm flex items-center justify-center"
                  >
                    {isChecked && (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path
                          d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                          fill="#1F1F1F"
                        />
                      </svg>
                    )}
                  </button>
                  <span className="text-white text-base font-normal">Keep me logged in</span>
                </div>

                {/* Sign In Button */}
                <button className="w-full bg-[#367AFF] text-white font-semibold text-lg py-4 rounded-[10px] hover:bg-[#2856CC] transition-colors">
                  Sign in
                </button>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[#D9D9D9]"></div>
                  <span className="text-[#6E6E6E] text-base font-normal px-2">or</span>
                  <div className="flex-1 h-px bg-[#D9D9D9]"></div>
                </div>

                {/* Google Sign In Button */}
                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white border border-[#E6E8E7] text-black font-semibold text-lg py-4 rounded-[10px] hover:bg-white/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                    <path d="M8.5 6.95H16.66C16.74 7.52 16.78 8.09 16.78 8.68C16.78 12.7 14.16 15.94 8.5 15.94C4.08 15.94 0.5 12.36 0.5 7.94C0.5 3.52 4.08 -0.06 8.5 -0.06C10.64 -0.06 12.52 0.72 13.96 2.04L11.66 4.24C10.78 3.42 9.66 2.98 8.5 2.98C5.74 2.98 3.5 5.22 3.5 7.98C3.5 10.74 5.74 12.98 8.5 12.98C11.66 12.98 13.24 10.86 13.52 9.28H8.5V6.95Z" fill="#4285F4"/>
                    <path d="M14.12 10.11C14.34 10.78 14.46 11.5 14.46 12.26C14.46 15.38 12.04 17.94 8.76 17.94C4.34 17.94 0.76 14.36 0.76 9.94C0.76 5.52 4.34 1.94 8.76 1.94C10.9 1.94 12.78 2.72 14.22 4.04L11.92 6.24C11.04 5.42 9.92 4.98 8.76 4.98C6 4.98 3.76 7.22 3.76 9.98C3.76 12.74 6 14.98 8.76 14.98C11.92 14.98 13.5 12.86 13.78 11.28H8.76V8.95H16.92C17 9.52 17.04 10.09 17.04 10.68C17.04 14.7 14.42 17.94 8.76 17.94Z" fill="#34A853"/>
                    <path d="M0.9 10.11C0.68 9.44 0.56 8.72 0.56 7.96C0.56 4.84 2.98 2.28 6.26 2.28C10.68 2.28 14.26 5.86 14.26 10.28C14.26 14.7 10.68 18.28 6.26 18.28C2.84 18.28 0.08 15.52 0.08 12.1C0.08 11.48 0.4 10.76 0.9 10.11Z" fill="#FBBC05"/>
                    <path d="M0.9 0C4.32 0 7.08 2.76 7.08 6.18C7.08 6.8 6.76 7.52 6.26 8.17C2.84 8.17 0.08 5.41 0.08 2C0.08 1.38 0.4 0.66 0.9 0Z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>

              {/* Create Account Link */}
              <div className="text-center">
                <p className="text-[#1F1F1F]/60 text-lg font-light">
                  Need an account? Create one
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
