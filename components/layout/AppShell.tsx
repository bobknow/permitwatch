import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white md:flex">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <TopBar />

        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}