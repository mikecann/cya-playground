import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    const entries = await ctx.db
      .query("activityLog")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(50);

    const result = [];
    for (const entry of entries) {
      const user = await ctx.db.get("users", entry.userId);
      result.push({
        ...entry,
        userName: user?.name ?? "Unknown",
      });
    }

    return result;
  },
});

export const log = internalMutation({
  args: {
    action: v.string(),
    userId: v.id("users"),
    projectId: v.id("projects"),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLog", {
      action: args.action,
      userId: args.userId,
      projectId: args.projectId,
      entityType: args.entityType,
      entityId: args.entityId,
      metadata: args.metadata,
    });
    return null;
  },
});
