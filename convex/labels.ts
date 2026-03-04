import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { incrementMutationCount } from "./platformStats";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership) return [];

    return await ctx.db
      .query("labels")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(200);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership || membership.role === "viewer") {
      throw new Error("Viewers cannot create labels");
    }

    const labelId = await ctx.db.insert("labels", {
      name: args.name,
      color: args.color,
      projectId: args.projectId,
    });
    await incrementMutationCount(ctx);
    return labelId;
  },
});

export const addToTask = mutation({
  args: {
    taskId: v.id("tasks"),
    labelId: v.id("labels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) throw new Error("Task not found");

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", task.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership || membership.role === "viewer") {
      throw new Error("Viewers cannot modify task labels");
    }

    const taskLabelId = await ctx.db.insert("taskLabels", {
      taskId: args.taskId,
      labelId: args.labelId,
    });
    await incrementMutationCount(ctx);
    return taskLabelId;
  },
});

export const removeFromTask = mutation({
  args: {
    taskId: v.id("tasks"),
    labelId: v.id("labels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) throw new Error("Task not found");

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", task.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership || membership.role === "viewer") {
      throw new Error("Viewers cannot modify task labels");
    }

    const taskLabel = await ctx.db
      .query("taskLabels")
      .withIndex("by_taskId_and_labelId", (q) =>
        q.eq("taskId", args.taskId).eq("labelId", args.labelId),
      )
      .unique();

    if (taskLabel) {
      await ctx.db.delete("taskLabels", taskLabel._id);
    }

    await incrementMutationCount(ctx);
    return null;
  },
});
