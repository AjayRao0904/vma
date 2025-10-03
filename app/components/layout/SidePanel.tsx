"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface SidePanelProps {
  currentPage?: 'performance-ads' | 'motion-pictures' | 'audio-branding';
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function SidePanel({ 
  currentPage = 'motion-pictures', 
  isCollapsed = false,
  onToggleCollapse 
}: SidePanelProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div 
      className={`h-full bg-black border-r border-white/20 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-[60px]' : 'w-full'
      }`}
      style={{ 
        minWidth: isCollapsed ? '60px' : '200px', 
        maxWidth: isCollapsed ? '60px' : '500px' 
      }}
    >
      {/* Header Section */}
      <div className="p-4 pb-0">
        <div className="flex items-end justify-between gap-[14px] mb-[62px]">
          {!isCollapsed && (
            <div className="flex-1 h-[31px] relative max-w-[249px]">
              <div className="w-full h-[29px] bg-[#D9D9D9] rounded-[30px] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange to-orange-light opacity-50"></div>
              </div>
              
              <div className="absolute left-[10px] top-0 w-[83px] h-[29.86px]">
                <div className="absolute left-[15.56px] top-[4.63px] text-orange-light font-normal text-[16.82px] leading-[1.5] tracking-[-0.08em]">
                  aalap.a
                </div>
                
                <div className="absolute left-0 top-[10.18px] w-[16.91px] h-[14.05px] bg-orange-light rounded-sm flex items-center justify-center">
                  <span className="text-orange text-xs font-bold">A</span>
                </div>
                
                <div className="absolute left-[50.97px] top-[13.12px] w-[32.03px] h-[10.77px]">
                  <div className="absolute left-[20.39px] top-[-4.71px] text-orange-light font-normal text-[13.46px] leading-[1.5] tracking-[-0.08em]">
                    I
                  </div>
                </div>
                
                <div className="absolute left-[68.89px] top-0 text-orange-light font-normal text-[16.82px] leading-[1.5] tracking-[-0.08em]">
                  *
                </div>
              </div>
            </div>
          )}

          {/* Sidebar toggle */}
          <button 
            onClick={onToggleCollapse}
            className="w-[20px] h-[20px] bg-white rounded-sm flex items-center justify-center hover:bg-white/90 transition-colors flex-shrink-0"
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" className="text-black">
              {isCollapsed ? (
                <path d="M9 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        </div>

        {/* Main Content */}
        {!isCollapsed && (
          <div className="flex flex-col items-center gap-[62px]">
            {/* Quick Actions */}
            <div className="w-full max-w-[272px] flex flex-col gap-[18px]">
              <h3 className="text-white/20 font-normal text-base">Quick Actions</h3>
              
              <div className="flex items-center gap-[6px]">
                <button 
                  onClick={() => handleNavigation('/motion-pictures/new')}
                  className="flex items-center gap-[18px] p-[8px_18px] rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-[20px] h-[20px] bg-white rounded-sm flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-black">
                      <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-white font-normal text-base">New Project</span>
                </button>
              </div>

              <div className="flex items-center gap-[6px]">
                <button className="flex items-center gap-[18px] p-[8px_18px] rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-[20px] h-[20px] bg-white rounded-sm flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-black">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <span className="text-white font-normal text-base">Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto w-full max-w-[315px] flex flex-col items-center gap-[10px] pb-4">
        {/* Profile Section */}
        {!isCollapsed && (
          <div className="w-full max-w-[292px] flex flex-col gap-[10px] p-1">
            <div className="w-full max-w-[235px] h-[47px] flex items-center gap-3">
              {/* Profile Image */}
              <div className="w-10 h-10 rounded-full overflow-hidden relative">
                {session?.user?.image ? (
                  <img 
                    src={session.user.image} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange to-orange-light flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {session?.user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Email */}
              <div className="flex-1">
                <span className="text-white font-normal text-sm">
                  {session?.user?.email || 'user@example.com'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <button 
          onClick={handleSignOut}
          className={`${isCollapsed ? 'w-8 h-8' : 'w-full max-w-[292px]'} flex items-center justify-center gap-2 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {!isCollapsed && <span className="text-white font-medium text-sm">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}