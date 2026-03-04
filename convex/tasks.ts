import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import schema from "./schema";
import { taskCounts } from "./taskCounts";

const taskFields = schema.tables.tasks.validator.fields;

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

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(200);

    const result = [];
    for (const task of tasks) {
      let assigneeName: string | undefined;
      if (task.assigneeId) {
        const assignee = await ctx.db.get("users", task.assigneeId);
        assigneeName = assignee?.name ?? "Unknown";
      }

      const hasComments = await ctx.db
        .query("comments")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .take(1);

      result.push({
        ...task,
        assigneeName,
        hasComments: hasComments.length > 0,
      });
    }

    return result;
  },
});

export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) return null;

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", task.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership) return null;

    let assigneeName: string | undefined;
    if (task.assigneeId) {
      const assignee = await ctx.db.get("users", task.assigneeId);
      assigneeName = assignee?.name ?? "Unknown";
    }

    const commentSample = await ctx.db
      .query("comments")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .take(101);

    return {
      ...task,
      assigneeName,
      commentCount: Math.min(commentSample.length, 100),
      commentCountCapped: commentSample.length > 100,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    status: taskFields.status,
    priority: taskFields.priority,
    projectId: v.id("projects"),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
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
    if (!membership) throw new Error("Not a member of this project");
    if (membership.role === "viewer") {
      throw new Error("Viewers cannot create tasks");
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: args.status,
      priority: args.priority,
      projectId: args.projectId,
      assigneeId: args.assigneeId,
      dueDate: args.dueDate,
    });

    const newTask = await ctx.db.get("tasks", taskId);
    await taskCounts.insert(ctx, newTask!);

    await ctx.runMutation(internal.activity.log, {
      action: "created_task",
      userId,
      projectId: args.projectId,
      entityType: "task",
      entityId: taskId,
    });

    return taskId;
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(taskFields.status),
    priority: v.optional(taskFields.priority),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
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
    if (!membership) throw new Error("Not a member of this project");
    if (membership.role === "viewer") {
      throw new Error("Viewers cannot update tasks");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;

    await ctx.db.patch("tasks", args.taskId, updates);

    await ctx.runMutation(internal.activity.log, {
      action: "updated_task",
      userId,
      projectId: task.projectId,
      entityType: "task",
      entityId: args.taskId,
    });

    return null;
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
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
    if (!membership) throw new Error("Not a member of this project");
    if (membership.role === "viewer") {
      throw new Error("Viewers cannot delete tasks");
    }

    await ctx.runMutation(internal.activity.log, {
      action: "deleted_task",
      userId,
      projectId: task.projectId,
      entityType: "task",
      entityId: args.taskId,
    });

    await taskCounts.delete(ctx, task);
    await ctx.db.delete("tasks", args.taskId);

    // Schedule cleanup of comments and labels in the background
    await ctx.scheduler.runAfter(
      0,
      internal.tasks.cleanupTaskChildren,
      { taskId: args.taskId },
    );

    return null;
  },
});

export const cleanupTaskChildren = internalMutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 100;
    let hasMore = false;

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .take(BATCH_SIZE);
    for (const comment of comments) {
      await ctx.db.delete("comments", comment._id);
    }
    if (comments.length === BATCH_SIZE) hasMore = true;

    const taskLabels = await ctx.db
      .query("taskLabels")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .take(BATCH_SIZE);
    for (const tl of taskLabels) {
      await ctx.db.delete("taskLabels", tl._id);
    }
    if (taskLabels.length === BATCH_SIZE) hasMore = true;

    if (hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.tasks.cleanupTaskChildren,
        { taskId: args.taskId },
      );
    }

    return null;
  },
});
