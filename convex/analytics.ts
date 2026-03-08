import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Analytics queries for use via the Convex Dashboard

export const getProjectStats = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    const statusCounts = { backlog: 0, todo: 0, in_progress: 0, done: 0 };
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    let assignedCount = 0;
    let overdueCount = 0;
    const now = Date.now();

    for (const task of allTasks) {
      statusCounts[task.status]++;
      priorityCounts[task.priority]++;
      if (task.assigneeId) assignedCount++;
      if (task.dueDate && task.dueDate < now && task.status !== "done") {
        overdueCount++;
      }
    }

    return {
      totalTasks: allTasks.length,
      statusCounts,
      priorityCounts,
      assignedCount,
      overdueCount,
    };
  },
});
