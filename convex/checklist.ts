import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const addItem = mutation({
  args: {
    taskId: v.id("tasks"),
    text: v.string(),
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
      throw new Error("Viewers cannot edit tasks");
    }

    const checklist = task.checklist ?? [];
    checklist.push({ text: args.text, completed: false });
    await ctx.db.patch("tasks", args.taskId, { checklist });
  },
});

export const toggleItem = mutation({
  args: {
    taskId: v.id("tasks"),
    index: v.number(),
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
      throw new Error("Viewers cannot edit tasks");
    }

    const checklist = task.checklist ?? [];
    if (args.index < 0 || args.index >= checklist.length) {
      throw new Error("Invalid checklist index");
    }

    checklist[args.index] = {
      ...checklist[args.index],
      completed: !checklist[args.index].completed,
    };
    await ctx.db.patch("tasks", args.taskId, { checklist });
  },
});
