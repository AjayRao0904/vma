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
            <div className="flex-1 h-[31px] relative max-w-[249px] flex items-center">
              <img 
                src="/aalap_logo.svg" 
                alt="Aalap Logo" 
                className="h-[30px] w-auto object-contain"
              />
            </div>
          )}

          {/* Sidebar toggle */}
          <button 
            onClick={onToggleCollapse}
            className="w-[32px] h-[32px] bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all duration-200 flex-shrink-0 group"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white group-hover:scale-110 transition-transform duration-200">
              {/* Clean hamburger menu lines */}
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Main Content */}
        {!isCollapsed && (
          <div className="flex flex-col items-center gap-[62px]">
            {/* Quick Actions */}
            <div className="w-full max-w-[272px] flex flex-col gap-[18px]">
              <h3 className="text-white/60 font-medium text-sm uppercase tracking-wider">Quick Actions</h3>

              <div className="flex items-center gap-[6px]">
                <button
                  onClick={() => handleNavigation('/motion-pictures/new')}
                  className="flex items-center gap-[18px] p-[8px_18px] rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-[20px] h-[20px] bg-white rounded-sm flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-black">
                      <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-white font-normal text-base">New Project</span>
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
          className={`${isCollapsed ? 'w-8 h-8' : 'w-full max-w-[292px]'} flex items-center justify-center gap-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20`}
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