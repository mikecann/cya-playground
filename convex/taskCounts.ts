import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { Id } from "./_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";
import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const taskCounts = new TableAggregate<{
  Namespace: Id<"projects">;
  Key: null;
  DataModel: DataModel;
  TableName: "tasks";
}>(components.aggregate, {
  namespace: (doc) => doc.projectId,
  sortKey: () => null,
});

export const getForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership) return null;

    return await taskCounts.count(ctx, { namespace: args.projectId });
  },
});

export const backfill = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    for (const task of tasks) {
      await taskCounts.insertIfDoesNotExist(ctx, task);
    }
  },
});
