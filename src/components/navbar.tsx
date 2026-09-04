"use client";

import Link from "next/link";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  user: {
    name: string;
    email: string;
  };
}

export function Navbar({
  user,
}: NavbarProps) {
  async function logout() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            S
          </div>

          <div>
            <p className="text-sm font-bold tracking-tight text-slate-950">
              Stock Attention
            </p>

            <p className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 sm:block">
              Market intelligence
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-slate-800">
              {user.name}
            </p>

            <p className="text-[11px] text-slate-400">
              {user.email}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}