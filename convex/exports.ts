import { mutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const requestExport = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get("projects", args.projectId);
    if (!project) throw new Error("Project not found");

    await ctx.scheduler.runAfter(0, internal.exports.generateAndSend, {
      projectId: args.projectId,
      email: args.email,
    });
  },
});

export const generateAndSend = internalAction({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
  },
  handler: async (_ctx, args) => {
    // TODO: Compile project tasks into CSV and send via email
    console.log(
      `Export requested for project ${args.projectId}, sending to ${args.email}`,
    );
  },
});
