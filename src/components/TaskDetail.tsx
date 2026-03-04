import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { useToast } from "./Toast";

type Member = {
  _id: Id<"projectMembers">;
  userId: Id<"users">;
  userName: string;
  userEmail: string;
  role: "admin" | "editor" | "viewer";
  projectId: Id<"projects">;
  _creationTime: number;
};

export function TaskDetail({
  taskId,
  members,
  onClose,
  onStatusChange,
}: {
  taskId: Id<"tasks">;
  members: Member[];
  onClose: () => void;
  onStatusChange: (
    status: "backlog" | "todo" | "in_progress" | "done",
  ) => void;
}) {
  const task = useQuery(api.tasks.get, { taskId });
  const comments = useQuery(api.comments.listByTask, { taskId });
  const updateTask = useMutation(api.tasks.update);
  const addComment = useMutation(api.comments.create);
  const deleteComment = useMutation(api.comments.remove);
  const deleteTask = useMutation(api.tasks.remove);
  const duplicateTask = useMutation(api.tasks.duplicate);

  const { addToast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  if (!task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center pt-16 px-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            {isEditing ? (
              <div className="flex-1 mr-4">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xl font-bold px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full mt-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      updateTask({
                        taskId,
                        title: editTitle,
                        description: editDescription,
                      })
                        .then(() => setIsEditing(false))
                        .catch((err: Error) => addToast(err.message));
                    }}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 mr-4">
                <h2 className="text-xl font-bold">{task.title}</h2>
                {task.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {task.description}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) =>
                  onStatusChange(
                    e.target.value as
                      | "backlog"
                      | "todo"
                      | "in_progress"
                      | "done",
                  )
                }
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) => {
                  updateTask({
                    taskId,
                    priority: e.target.value as
                      | "low"
                      | "medium"
                      | "high"
                      | "urgent",
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Assignee
              </label>
              <select
                value={task.assigneeId ?? ""}
                onChange={(e) => {
                  updateTask({
                    taskId,
                    assigneeId: e.target.value
                      ? (e.target.value as Id<"users">)
                      : undefined,
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userName}
                  </option>
                ))}
              </select>
            </div>
            <div className="ml-auto flex gap-2 self-end">
              {!isEditing && (
                <button
                  onClick={() => {
                    setEditTitle(task.title);
                    setEditDescription(task.description);
                    setIsEditing(true);
                  }}
                  className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  duplicateTask({ taskId })
                    .then(() => addToast("Task duplicated"))
                    .catch((err: Error) => addToast(err.message));
                }}
                className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors"
              >
                Duplicate
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this task?")) {
                    deleteTask({ taskId })
                      .then(() => onClose())
                      .catch((err: Error) => addToast(err.message));
                  }
                }}
                className="px-3 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="font-semibold mb-3">
              Comments ({comments?.length ?? 0}
              {(comments?.length ?? 0) >= 100 ? "+" : ""})
            </h3>
            <div className="space-y-3 mb-4">
              {comments?.map((comment) => (
                <div
                  key={comment._id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {comment.authorName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {new Date(comment._creationTime).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => {
                          deleteComment({ commentId: comment._id }).catch(
                            (err: Error) => addToast(err.message),
                          );
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {comment.content}
                  </p>
                </div>
              ))}
              {comments?.length === 0 && (
                <p className="text-sm text-slate-400">No comments yet</p>
              )}
              {(comments?.length ?? 0) >= 100 && (
                <p className="text-xs text-slate-400">
                  Showing the most recent 100 comments.
                </p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentText.trim()) return;
                addComment({ taskId, content: commentText })
                  .then(() => setCommentText(""))
                  .catch((err: Error) => addToast(err.message));
              }}
              className="flex gap-2"
            >
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Comment
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
