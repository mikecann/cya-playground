import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { useToast } from "./Toast";

export function Dashboard({
  onSelectProject,
}: {
  onSelectProject: (projectId: Id<"projects">) => void;
}) {
  const projects = useQuery(api.projects.list);
  const createProject = useMutation(api.projects.create);
  const { addToast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          New Project
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-3">Create Project</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createProject({ name, description })
                .then(() => {
                  setName("");
                  setDescription("");
                  setShowCreateForm(false);
                })
                .catch((err: Error) => addToast(err.message));
            }}
            className="flex flex-col gap-3"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              required
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              required
              rows={2}
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
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
            </div>
          </form>
        </div>
      )}

      {projects === undefined ? (
        <div className="text-slate-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400 mb-2">
            No projects yet
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Create a project to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <button
              key={project._id}
              onClick={() => onSelectProject(project._id)}
              className="text-left p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            >
              <h3 className="font-semibold mb-1">{project.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                {project.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                <span className="capitalize px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                  {project.role}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
