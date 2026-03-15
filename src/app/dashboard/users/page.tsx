import { listUsersForAdmin } from "@/lib/dal/users";
import { UsersAdminClient } from "./UsersAdminClient";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const users = await listUsersForAdmin();

  return (
    <>
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Users</h1>
          <p className="dashboard-description">
            All users who have logged in with Discord, with basic activity and membership info.
          </p>
        </div>
      </header>
      <UsersAdminClient users={users} />
    </>
  );
}

