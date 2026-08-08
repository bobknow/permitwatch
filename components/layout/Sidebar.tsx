"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Customers", href: "/customers" },
  { name: "Properties", href: "/properties" },
  { name: "Boilers", href: "/boilers" },
  { name: "Permits", href: "/permits" },
  { name: "Documents", href: "/documents" },
  { name: "Notifications", href: "/notifications" },
  { name: "Users", href: "/users" },
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-5 py-7">
      <Link
        href="/dashboard"
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
              aria-current={
                active ? "page" : undefined
              }
              className={`block rounded-xl px-4 py-3 font-medium transition ${
                active
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
    </aside>
  );
}