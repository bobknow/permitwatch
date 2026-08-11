import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
  redirect("/login?next=/users");
}

  const { data: users, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      is_active,
      created_at
    `)
    .eq("tenant_id", profile.tenant_id)
    .order("full_name");

  if (error) {
    console.error(error);
  }

  return (
    <main className="p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Users
          </h1>

          <p className="mt-1 text-slate-600">
            Manage team access.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-white shadow">
        <table className="w-full text-slate-900">
          <thead className="border-b">
            <tr className="text-left">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>

          <tbody>
            {users?.length ? (
              users.map((user: any) => (
                <tr
                  key={user.id}
                  className="border-b"
                >
                  <td className="p-4 font-semibold">
                    {user.full_name}
                  </td>

                  <td className="p-4">
                    {user.email}
                  </td>

                  <td className="p-4 capitalize">
                    {user.role}
                  </td>

                  <td className="p-4">
                    {user.is_active ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                        Disabled
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    {new Date(
                      user.created_at
                    ).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="p-10 text-center text-slate-500"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}