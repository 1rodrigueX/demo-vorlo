"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/companies", label: "Empresas" },
  { href: "/whatsapp", label: "Leads" },
];

export function Topbar({ name, email }: { name: string; email: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <button
        type="button"
        className="text-gray-500 md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Abrir menu"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <span className="text-sm font-semibold text-gray-900 md:hidden">CRM Nyplastic</span>
      <div className="ml-auto">
        <UserMenu name={name} email={email} />
      </div>

      {mobileOpen && (
        <nav className="absolute left-0 top-16 flex w-full flex-col border-b border-gray-200 bg-white p-2 shadow-lg md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
