"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Customers", href: "/customers" },
  { name: "Properties", href: "/properties" },
  { name: "Boilers", href: "/boilers" },
  { name: "Permits", href: "/permits" },
  { name: "Documents", href: "/documents" },
  {
    name: "Notifications",
    href: "/notifications",
  },
  { name: "Users", href: "/users" },
  { name: "Help", href: "/help" },
  { name: "Settings", href: "/settings" },
];

function isActiveRoute(
  pathname: string,
  href: string
) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

function Navigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link
        href="/"
        onClick={onNavigate}
        className="group"
      >
        <h1 className="text-2xl font-black text-white transition group-hover:text-emerald-400">
          PermitWatch
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Compliance Management Platform
        </p>
      </Link>

      <nav className="mt-10 space-y-1.5">
        {links.map((link) => {
          const active = isActiveRoute(
            pathname,
            link.href
          );

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-current={
                active ? "page" : undefined
              }
              className={`block rounded-xl px-4 py-3 font-medium transition ${active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-900 hover:text-emerald-400"
                }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800 pt-5">
        <p className="px-4 text-xs leading-5 text-slate-500">
          PermitWatch
          <br />
          Portfolio Compliance
        </p>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] =
    useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-5 py-7 md:flex">
        <Navigation pathname={pathname} />
      </aside>

      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() =>
          setIsOpen((current) => !current)
        }
        aria-label="Open navigation"
        aria-expanded={isOpen}
        className="fixed left-4 top-4 z-[70] flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-white shadow-lg md:hidden"
      >
        {isOpen ? (
          <span className="text-2xl leading-none">
            ×
          </span>
        ) : (
          <span className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-5 rounded bg-white" />
            <span className="block h-0.5 w-5 rounded bg-white" />
            <span className="block h-0.5 w-5 rounded bg-white" />
          </span>
        )}
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-slate-800 bg-slate-950 px-5 pb-7 pt-20 shadow-2xl transition-transform duration-200 md:hidden ${isOpen
            ? "translate-x-0"
            : "-translate-x-full"
          }`}
      >
        <Navigation
          pathname={pathname}
          onNavigate={() =>
            setIsOpen(false)
          }
        />
      </aside>
    </>
  );
}