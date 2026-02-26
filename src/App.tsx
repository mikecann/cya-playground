import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { SignIn } from "./components/SignIn";
import { Dashboard } from "./components/Dashboard";
import { ProjectView } from "./components/ProjectView";
import { useToast } from "./components/Toast";

type Route =
  | { page: "dashboard" }
  | { page: "project"; projectId: Id<"projects">; initialTaskId?: Id<"tasks"> };

export default function App() {
  const user = useQuery(api.users.currentUser);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (user === null) {
    return <SignIn />;
  }

  return <AuthenticatedApp userName={user.name ?? "User"} />;
}

function AuthenticatedApp({ userName }: { userName: string }) {
  const { signOut } = useAuthActions();
  const { addToast } = useToast();
  const [route, setRoute] = useState<Route>({ page: "dashboard" });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setRoute({ page: "dashboard" })}
            className="text-lg font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            TaskFlow
          </button>
          {route.page === "project" && (
            <span className="text-slate-400 dark:text-slate-500">
              / Project
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {userName}
          </span>
          <button
            onClick={() => {
              signOut().catch((err: Error) => addToast(err.message));
            }}
            className="text-sm px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {route.page === "dashboard" && (
          <Dashboard
            onSelectProject={(projectId, taskId) =>
              setRoute({ page: "project", projectId, initialTaskId: taskId })
            }
          />
        )}
        {route.page === "project" && (
          <ProjectView
            projectId={route.projectId}
            initialTaskId={route.initialTaskId}
            onBack={() => setRoute({ page: "dashboard" })}
          />
        )}
      </main>
    </div>
  );
}
