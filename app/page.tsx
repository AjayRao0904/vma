"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Home() {
  const [isChecked, setIsChecked] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleLetsStart = () => {
    if (session) {
      // If user is logged in, redirect to dashboard
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="h-screen gradient-bg flex p-4">
      <div className="flex w-full gap-4">
        {/* Orange Card */}
        <div className="w-3/4 h-full orange-gradient relative overflow-hidden rounded-lg">
          <div className="absolute inset-0 flex flex-col items-center justify-end gap-6 px-6 pb-16">
            {/* Logo */}
            <div className="w-full max-w-[300px] h-[100px] relative">
              <div className="text-orange-light font-normal text-2xl md:text-4xl lg:text-5xl leading-[1.5] tracking-[-0.08em] absolute left-[50px] top-[15px]">
                aalap.a
              </div>
              
              {/* Vector placeholder - using a simple icon */}
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

        {/* Info Card */}
        <div className="w-1/4 h-full bg-transparent flex flex-col items-center justify-center px-6 rounded-lg">
          <div className="w-full max-w-[400px] flex flex-col items-center gap-12">
            {/* Main Content */}
            <div className="w-full flex flex-col gap-8">
              {/* Header Section */}
              <div className="w-full flex flex-col gap-6">
                <div className="w-full flex flex-col gap-2">
                  {/* Hey with emoji */}
                  <div className="flex items-center gap-2">
                    <span className="text-white font-normal text-[44px] leading-[1.28] italic" style={{fontFamily: 'Times New Roman, serif'}}>Hey</span>
                    <span className="text-white font-normal text-2xl md:text-3xl leading-[1.28] font-serif">👋</span>
                  </div>
                  
                  {/* Welcome text */}
                  <h1 className="text-white font-medium text-2xl md:text-3xl leading-[1.28]">
                    {session ? `Welcome back, ${session.user?.name?.split(' ')[0]}!` : 'Welcome to Aalap'}
                  </h1>
                </div>
                
                {/* User info or subtitle */}
                {session ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-white/80 font-normal text-base">
                      {session.user?.email}
                    </p>
                    <p className="text-white/60 font-normal text-sm">
                      You're successfully logged in with Google
                    </p>
                  </div>
                ) : (
                  <p className="text-white/60 font-normal text-base md:text-lg leading-[1.44]">
                    Let's get to know you so you can start directing your music
                  </p>
                )}
              </div>
              
              {/* Checkbox Section */}
              <div className="w-full flex items-center gap-3">
                <button
                  onClick={() => setIsChecked(!isChecked)}
                  className="w-5 h-5 bg-white rounded-sm flex items-center justify-center flex-shrink-0"
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
                <p className="text-white/60 font-semibold text-sm md:text-base leading-[1.32]">
                  I agree to the Terms & Conditions and Privacy Policy
                </p>
              </div>
            </div>
            
            {/* Button */}
            <div className="flex flex-col gap-4">
              <div className="relative">
                <button 
                  onClick={handleLetsStart}
                  className="relative w-[280px] md:w-[328px] h-[55px] bg-[#1F1F1F] rounded-[28px] border border-orange-light/20 overflow-hidden group hover:bg-[#2A2A2A] transition-colors"
                >
                  {/* Animated glow effect on hover */}
                  <div className="absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-orange/50 via-orange-light/30 to-orange/50 animate-glow"></div>
                    <div className="absolute inset-0 rounded-[28px] bg-gradient-conic from-orange/40 via-transparent to-orange/40 animate-rotate-glow"></div>
                  </div>
                  
                  {/* Blur effect background */}
                  <div className="absolute inset-0 bg-[#1F1F1F] rounded-[28px] blur-[8px] z-10"></div>
                  
                  {/* Gradient border effect */}
                  <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-orange to-transparent opacity-50 z-10"></div>
                  
                  {/* Button content */}
                  <div className="relative z-20 flex items-center justify-center h-full bg-[#1F1F1F] rounded-[28px] group-hover:bg-[#2A2A2A] transition-colors">
                    <span className="text-white font-normal text-sm md:text-base leading-[1.48]">
                      {session ? 'Continue to Dashboard' : 'Let\'s Start'}
                    </span>
                  </div>
                </button>
              </div>
              
              {/* Sign out button - only show when logged in */}
              {session && (
                <button 
                  onClick={handleSignOut}
                  className="text-white/60 hover:text-white/80 font-normal text-sm transition-colors underline"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}