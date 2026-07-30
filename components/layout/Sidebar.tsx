import Link from "next/link";

const links = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Customers", href: "/customers" },
  { name: "Properties", href: "/properties" },
  { name: "Boilers", href: "/boilers" },
  { name: "Permits", href: "/permits" },
  { name: "Documents", href: "/documents" },
  { name: "Users", href: "/users" },
  { name: "Settings", href: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-72 min-h-screen border-r border-slate-800 bg-slate-950 p-8">
      <h1 className="text-3xl font-black text-white">
        PermitWatch
      </h1>

      <p className="mt-2 text-sm text-slate-400">
        Boiler Compliance Platform
      </p>

      <nav className="mt-10 space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-900 hover:text-emerald-400"
          >
            {link.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}