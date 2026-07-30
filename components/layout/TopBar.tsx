export default function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-8">

      <div>
        <h2 className="text-xl font-black text-white">
          PermitWatch
        </h2>

        <p className="text-sm text-slate-400">
          Boiler Compliance Platform
        </p>
      </div>

      <div className="flex items-center gap-4">

        <button className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:border-emerald-500">
          Notifications
        </button>

        <button className="rounded-xl bg-emerald-600 px-5 py-2 font-bold">
          Bobbie
        </button>

      </div>

    </header>
  );
}