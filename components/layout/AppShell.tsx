import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">

      <Sidebar />

      <div className="flex flex-1 flex-col">

        <TopBar />

        <main className="flex-1 p-8">
          {children}
        </main>

      </div>

    </div>
  );
}