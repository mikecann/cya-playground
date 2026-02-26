import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { TaskDetail } from "./TaskDetail";
import { useToast } from "./Toast";

const STATUS_COLUMNS = [
  { key: "backlog" as const, label: "Backlog" },
  { key: "todo" as const, label: "To Do" },
  { key: "in_progress" as const, label: "In Progress" },
  { key: "done" as const, label: "Done" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
};

export function ProjectView({
  projectId,
  initialTaskId,
  onBack,
}: {
  projectId: Id<"projects">;
  initialTaskId?: Id<"tasks">;
  onBack: () => void;
}) {
  const project = useQuery(api.projects.get, { projectId });
  const tasks = useQuery(api.tasks.listByProject, { projectId });
  const members = useQuery(api.members.listByProject, { projectId });
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const { addToast } = useToast();

  const [selectedTaskId, setSelectedTaskId] =
    useState<Id<"tasks"> | null>(initialTaskId ?? null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<
    "backlog" | "todo" | "in_progress" | "done"
  >("todo");
  const [showMembers, setShowMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useQuery(
    api.tasks.searchInProject,
    searchQuery.trim()
      ? { projectId, query: searchQuery }
      : "skip",
  );

  if (project === undefined || tasks === undefined) {
    return <div className="text-slate-500">Loading...</div>;
  }

  if (project === null) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">Project not found</p>
        <button
          onClick={onBack}
          className="text-blue-600 hover:underline text-sm"
        >
          Back to projects
        </button>
      </div>
    );
  }

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            &larr;
          </button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {project.description}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors"
          >
            Members ({members?.length ?? 0})
          </button>
          {project.role !== "viewer" && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              New Task
            </button>
          )}
        </div>
      </div>

      {showMembers && members && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-3">Members</h3>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m._id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {m.userName}{" "}
                  <span className="text-slate-400">({m.userEmail})</span>
                </span>
                <span className="capitalize px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">
                  {m.role}
                </span>
              </div>
            ))}
            {members.length >= 100 && (
              <p className="text-xs text-slate-400 mt-2">
                Showing first 100 members.
              </p>
            )}
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-3">New Task</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTask({
                title: newTaskTitle,
                description: "",
                status: newTaskStatus,
                priority: "medium",
                projectId,
              })
                .then(() => {
                  setNewTaskTitle("");
                  setShowCreateForm(false);
                })
                .catch((err: Error) => addToast(err.message));
            }}
            className="flex gap-3 items-end"
          >
            <div className="flex-1">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
                required
                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={newTaskStatus}
              onChange={(e) => setNewTaskStatus(e.target.value as typeof newTaskStatus)}
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_COLUMNS.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {isSearching ? (
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {searchResults === undefined
              ? "Searching..."
              : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"} for "${searchQuery}"`}
          </p>
          <div className="space-y-2">
            {(searchResults ?? []).map((task) => (
              <button
                key={task._id}
                onClick={() => setSelectedTaskId(task._id)}
                className="w-full text-left p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <p className="text-sm font-medium mb-1">{task.title}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] ?? ""}`}
                  >
                    {task.priority}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">
                    {task.status.replace("_", " ")}
                  </span>
                  {task.assigneeName && (
                    <span className="text-xs text-slate-400">
                      {task.assigneeName}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {searchResults?.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">
                No tasks match your search.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {tasks && tasks.length >= 200 && (
            <p className="mb-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
              Showing the first 200 tasks. Some tasks may not be visible.
            </p>
          )}

          <div className="grid grid-cols-4 gap-4">
            {STATUS_COLUMNS.map((col) => {
              const columnTasks = (tasks ?? []).filter(
                (t) => t.status === col.key,
              );
              return (
                <div key={col.key}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {col.label}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {columnTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {columnTasks.map((task) => (
                      <button
                        key={task._id}
                        onClick={() => setSelectedTaskId(task._id)}
                        className="w-full text-left p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                      >
                        <p className="text-sm font-medium mb-2">{task.title}</p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] ?? ""}`}
                          >
                            {task.priority}
                          </span>
                          {task.assigneeName && (
                            <span className="text-xs text-slate-400">
                              {task.assigneeName}
                            </span>
                          )}
                          {task.hasComments && (
                            <span className="text-xs text-slate-400 ml-auto">
                              💬
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          members={members ?? []}
          onClose={() => setSelectedTaskId(null)}
          onStatusChange={(status) => {
            updateTask({ taskId: selectedTaskId, status }).catch(
              (err: Error) => addToast(err.message),
            );
          }}
        />
      )}
    </div>
  );
}
