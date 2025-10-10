"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Home() {
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
            <div className="w-full max-w-[300px] h-[100px] relative flex items-center justify-center">
              <img 
                src="/aalap_logo.svg" 
                alt="Aalap Logo" 
                className="h-full w-auto object-contain"
              />
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
            </div>
            
            {/* Button */}
            <div className="flex flex-col gap-4">
              <div className="relative">
                <button 
                  onClick={handleLetsStart}
                  className="relative w-[280px] md:w-[328px] h-[55px] bg-black rounded-[28px] border border-orange-light/20 overflow-hidden group hover:bg-black/80 transition-colors"
                >
                  {/* Animated glow effect on hover */}
                  <div className="absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-orange-dark/50 via-orange-light/30 to-orange-dark/50 animate-glow"></div>
                    <div className="absolute inset-0 rounded-[28px] bg-gradient-conic from-orange-dark/40 via-transparent to-orange-light/40 animate-rotate-glow"></div>
                  </div>
                  
                  {/* Blur effect background */}
                  <div className="absolute inset-0 bg-black rounded-[28px] blur-[8px] z-10"></div>
                  
                  {/* Gradient border effect */}
                  <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-orange-dark to-orange-light opacity-50 z-10"></div>
                  
                  {/* Button content */}
                  <div className="relative z-20 flex items-center justify-center h-full bg-black rounded-[28px] group-hover:bg-black/80 transition-colors">
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