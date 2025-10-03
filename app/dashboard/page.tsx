"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) router.push("/login");
  }, [session, status, router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[1329px] flex flex-col items-center gap-[92px]">
        {/* Header Section */}
        <div className="w-full max-w-[610px] flex flex-col items-center gap-[14px]">
          <h1 className="text-white font-medium text-[44px] leading-[1.28] text-center">
            Create a new workspace
          </h1>
          <p className="text-white/60 font-normal text-xl leading-[1.44] text-center">
            Start directing music by selecting the most relevant use case
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="w-full flex flex-row items-center gap-[42px] justify-center">
          {/* Performance Ads Card */}
          <div className="w-[415px] h-[415px] bg-white/[0.03] rounded-[10px] p-[10px] flex items-center justify-center hover:bg-white/[0.05] transition-colors cursor-pointer group">
            <div className="w-[292px] flex flex-col items-center gap-[60px]">
              {/* Icon */}
              <div className="w-[76px] h-[76px] bg-white rounded-lg flex items-center justify-center">
                <svg width="67" height="43" viewBox="0 0 67 43" fill="none" className="text-black">
                  <path d="M9.5 14.25H57.5L62.25 33.25H4.75L9.5 14.25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 4.75L14.25 14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M47.5 4.75L52.25 14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M33.25 9.5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              {/* Content */}
              <div className="flex flex-col items-center gap-5 w-full">
                <h3 className="text-white font-medium text-[30px] leading-[1.2] text-center">
                  Performance Ads
                </h3>
                <p className="text-white/60 font-normal text-xl leading-[1.44] text-center">
                  Music to boost scroll-stopping and CTR, created for your ad creative and audience targeting.
                </p>
              </div>
            </div>
          </div>

          {/* Motion Pictures Card */}
          <div className="w-[415px] h-[415px] bg-white/[0.03] rounded-[10px] p-[10px] flex items-center justify-center hover:bg-white/[0.05] transition-colors cursor-pointer group">
            <div className="w-[292px] flex flex-col items-center gap-[60px]">
              {/* Icon */}
              <div className="w-[76px] h-[76px] bg-white rounded-lg flex items-center justify-center">
                <svg width="62" height="52" viewBox="0 0 62 52" fill="none" className="text-black">
                  <rect x="7.13" y="11.88" width="47.75" height="28.25" rx="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7.13 23.5L19.88 30.13L7.13 36.75V23.5Z" fill="currentColor"/>
                  <circle cx="45.5" cy="19.5" r="9" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              
              {/* Content */}
              <div className="flex flex-col items-center gap-5 w-full">
                <h3 className="text-white font-medium text-[30px] leading-[1.2] text-center">
                  Motion Pictures
                </h3>
                <p className="text-white/60 font-normal text-xl leading-[1.44] text-center">
                  Create music & sound perfectly fit for your scene, be it Ad videos or film creation.
                </p>
              </div>
            </div>
          </div>

          {/* Audio Branding Card */}
          <div className="w-[415px] h-[415px] bg-white/[0.03] rounded-[10px] p-[10px] flex items-center justify-center hover:bg-white/[0.05] transition-colors cursor-pointer group">
            <div className="w-[292px] flex flex-col items-center gap-[60px]">
              {/* Icon */}
              <div className="w-[76px] h-[76px] bg-white rounded-lg flex items-center justify-center">
                <svg width="67" height="67" viewBox="0 0 67 67" fill="none" className="text-black">
                  <circle cx="33.5" cy="33.5" r="28.5" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="33.5" cy="33.5" r="19" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="33.5" cy="33.5" r="9.5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M33.5 4.75V14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M33.5 52.75V62.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M62.25 33.5H52.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M14.25 33.5H4.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              
              {/* Content */}
              <div className="flex flex-col items-center gap-5 w-full">
                <h3 className="text-white font-medium text-[30px] leading-[1.2] text-center">
                  Audio Branding
                </h3>
                <p className="text-white/60 font-normal text-xl leading-[1.44] text-center w-[253px]">
                  Craft sonic logos, jingles, and brand music that reinforce identity and boost recall.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="relative">
          <button className="relative w-[328px] h-[63px] bg-[#1F1F1F] rounded-[58px] border border-orange-light/20 overflow-hidden group hover:bg-[#2A2A2A] transition-colors">
            {/* Animated glow effect on hover */}
            <div className="absolute inset-0 rounded-[58px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 rounded-[58px] bg-gradient-to-r from-orange/50 via-orange-light/30 to-orange/50 animate-glow"></div>
              <div className="absolute inset-0 rounded-[58px] bg-gradient-conic from-orange/40 via-transparent to-orange/40 animate-rotate-glow"></div>
            </div>
            
            {/* Blur effect background */}
            <div className="absolute inset-0 bg-[#1F1F1F] rounded-[58px] blur-[10px] z-10"></div>
            
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-[58px] bg-gradient-to-r from-orange to-transparent opacity-50 z-10"></div>
            
            {/* Button content */}
            <div className="relative z-20 flex items-center justify-center h-full bg-[#1F1F1F] rounded-[58px] group-hover:bg-[#2A2A2A] transition-colors px-7">
              <span className="text-white font-normal text-base leading-[1.48]">
                Continue
              </span>
            </div>
          </button>
        </div>

        {/* User info and sign out */}
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <div className="text-white/80 text-sm">
            Welcome, {session.user?.name?.split(' ')[0]}
          </div>
          <button 
            onClick={handleSignOut}
            className="text-white/60 hover:text-white/80 text-sm transition-colors underline"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
