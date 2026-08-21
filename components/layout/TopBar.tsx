import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type PermitNoticeRow = {
  id: string;
  boiler_id: string;
  expiration_date: string | null;
  ocr_status: string | null;
  created_at: string;
};

function daysUntil(date: string) {
  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const target = new Date(
    `${date}T00:00:00`
  );

  return Math.ceil(
    (target.getTime() -
      todayStart.getTime()) /
      86_400_000
  );
}

function getInitials(name: string | null | undefined) {
  if (!name?.trim()) {
    return "U";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export default async function TopBar() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  let notificationCount = 0;

  if (profile?.tenant_id) {
    const { data, error } = await supabase
      .from("permits")
      .select(`
        id,
        boiler_id,
        expiration_date,
        ocr_status,
        created_at
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Unable to load top bar notifications:",
        error
      );
    } else {
      const permits =
        (data ?? []) as PermitNoticeRow[];

      /*
       * Only use the newest permit for each boiler.
       * Historical permits should not create alerts.
       */
      const latestPermitByBoiler =
        new Map<string, PermitNoticeRow>();

      for (const permit of permits) {
        if (
          !latestPermitByBoiler.has(
            permit.boiler_id
          )
        ) {
          latestPermitByBoiler.set(
            permit.boiler_id,
            permit
          );
        }
      }

      for (const permit of latestPermitByBoiler.values()) {
        let needsAttention =
          permit.ocr_status !== "complete";

        if (permit.expiration_date) {
          const remaining =
            daysUntil(
              permit.expiration_date
            );

          if (remaining <= 30) {
            needsAttention = true;
          }
        }

        if (needsAttention) {
          notificationCount += 1;
        }
      }
    }
  }

  const displayName =
    profile?.full_name?.trim() ||
    profile?.email ||
    "Account";

  return (
    <header className="flex min-h-20 items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 py-4 pl-16 pr-4 sm:gap-4 sm:px-6">
  <Link
    href="/dashboard"
    className="group min-w-0"
  >
    <h2 className="truncate text-lg font-black text-white transition group-hover:text-emerald-400 sm:text-xl">
      PermitWatch
    </h2>

    <p className="hidden text-sm text-slate-400 sm:block">
      Compliance Management Platform
    </p>
  </Link>

  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-emerald-500 hover:text-white sm:px-4 sm:text-sm"
    >
      <span className="hidden min-[390px]:inline">
        Notifications
      </span>

      <span className="min-[390px]:hidden">
        Alerts
      </span>

      {notificationCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
          {notificationCount > 99
            ? "99+"
            : notificationCount}
        </span>
      )}
    </Link>

    <Link
      href="/settings"
      className="flex shrink-0 items-center gap-3 rounded-xl bg-emerald-600 px-2 py-2 text-white transition hover:bg-emerald-500 sm:px-4"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-black">
        {getInitials(profile?.full_name)}
      </div>

      <div className="hidden min-w-0 sm:block">
        <p className="max-w-40 truncate text-sm font-bold">
          {displayName}
        </p>

        <p className="text-xs capitalize text-emerald-100">
          {profile?.role || "User"}
        </p>
      </div>
    </Link>
  </div>
</header>
  );
}