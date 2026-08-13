"use client";

import { useState, type ReactNode } from "react";
import { ErpSidebar } from "./ErpSidebar";
import { ErpTopbar } from "./ErpTopbar";
import { ErpMobileNav } from "./ErpMobileNav";

export function ErpShell({
  tenantSlug,
  userName,
  userEmail,
  userRole,
  sidebarDefaultCollapsed,
  children,
}: {
  tenantSlug: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  sidebarDefaultCollapsed: boolean;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="erp-print-hide">
        <ErpSidebar tenantSlug={tenantSlug} defaultCollapsed={sidebarDefaultCollapsed} />
      </div>
      <div className="erp-print-hide">
        <ErpMobileNav tenantSlug={tenantSlug} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="erp-print-hide">
          <ErpTopbar name={userName} email={userEmail} role={userRole} onMenuClick={() => setMobileNavOpen(true)} />
        </div>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
