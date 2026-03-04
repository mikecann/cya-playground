import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Overview queries for use via the Convex Dashboard

export const getProjectOverview = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Intentional cap: for this overview dashboard, we only show up to 50 tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(50);

    const enrichedTasks = [];
    for (const task of tasks) {
      const assignee = task.assigneeId
        ? await ctx.db.get("users", task.assigneeId)
        : null;

      // Intentional cap: we only display up to 10 labels per task in the UI
      const taskLabelRows = await ctx.db
        .query("taskLabels")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .take(10);

      const labels = [];
      for (const taskLabel of taskLabelRows) {
        const label = await ctx.db.get("labels", taskLabel.labelId);
        if (label) {
          labels.push({ name: label.name, color: label.color });
        }
      }

      enrichedTasks.push({
        _id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? null,
        assigneeName: assignee?.name ?? null,
        labels,
      });
    }

    return { tasks: enrichedTasks };
  },
});
