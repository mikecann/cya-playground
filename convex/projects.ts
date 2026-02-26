import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const COUNT_CAP = 100;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(50);

    const projects = [];
    for (const membership of memberships) {
      const project = await ctx.db.get("projects", membership.projectId);
      if (!project) continue;

      const memberSample = await ctx.db
        .query("projectMembers")
        .withIndex("by_projectId", (q) =>
          q.eq("projectId", membership.projectId),
        )
        .take(COUNT_CAP + 1);

      const taskSample = await ctx.db
        .query("tasks")
        .withIndex("by_projectId", (q) =>
          q.eq("projectId", membership.projectId),
        )
        .take(COUNT_CAP + 1);

      projects.push({
        ...project,
        memberCount: Math.min(memberSample.length, COUNT_CAP),
        memberCountCapped: memberSample.length > COUNT_CAP,
        taskCount: Math.min(taskSample.length, COUNT_CAP),
        taskCountCapped: taskSample.length > COUNT_CAP,
        role: membership.role,
      });
    }

    return projects;
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const project = await ctx.db.get("projects", args.projectId);
    if (!project) return null;

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId),
      )
      .unique();

    if (!membership) return null;

    return { ...project, role: membership.role };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      ownerId: userId,
    });

    await ctx.db.insert("projectMembers", {
      projectId,
      userId,
      role: "admin",
    });

    await ctx.runMutation(internal.activity.log, {
      action: "created_project",
      userId,
      projectId,
      entityType: "project",
      entityId: projectId,
    });

    return projectId;
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.string(),
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

    if (!membership || membership.role !== "admin") {
      throw new Error("Only project admins can update project details");
    }

    await ctx.db.patch("projects", args.projectId, {
      name: args.name,
      description: args.description,
    });

    return null;
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get("projects", args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== userId) {
      throw new Error("Only the project owner can delete a project");
    }

    // Delete just the project document. The list query already skips
    // memberships where the project is missing, so it vanishes immediately.
    await ctx.db.delete("projects", args.projectId);

    // Schedule background cleanup for ALL children (members, tasks, comments, etc.)
    await ctx.scheduler.runAfter(
      0,
      internal.projects.cleanupProjectChildren,
      { projectId: args.projectId },
    );

    return null;
  },
});

export const cleanupProjectChildren = internalMutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 50;
    let hasMore = false;

    // Delete tasks and their children
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(BATCH_SIZE);

    for (const task of tasks) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .take(BATCH_SIZE);
      for (const comment of comments) {
        await ctx.db.delete("comments", comment._id);
      }
      if (comments.length === BATCH_SIZE) hasMore = true;

      const taskLabels = await ctx.db
        .query("taskLabels")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .take(BATCH_SIZE);
      for (const tl of taskLabels) {
        await ctx.db.delete("taskLabels", tl._id);
      }
      if (taskLabels.length === BATCH_SIZE) hasMore = true;

      await ctx.db.delete("tasks", task._id);
    }
    if (tasks.length === BATCH_SIZE) hasMore = true;

    // Delete labels
    const labels = await ctx.db
      .query("labels")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(BATCH_SIZE);
    for (const label of labels) {
      await ctx.db.delete("labels", label._id);
    }
    if (labels.length === BATCH_SIZE) hasMore = true;

    // Delete members
    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(BATCH_SIZE);
    for (const member of members) {
      await ctx.db.delete("projectMembers", member._id);
    }
    if (members.length === BATCH_SIZE) hasMore = true;

    // Delete activity log entries
    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(BATCH_SIZE);
    for (const activity of activities) {
      await ctx.db.delete("activityLog", activity._id);
    }
    if (activities.length === BATCH_SIZE) hasMore = true;

    // If any batch was full, there might be more to clean up
    if (hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.projects.cleanupProjectChildren,
        { projectId: args.projectId },
      );
    }

    return null;
  },
});
