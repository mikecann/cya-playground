import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import schema from "./schema";

const memberFields = schema.tables.projectMembers.validator.fields;

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId),
      )
      .unique();
    if (!callerMembership) return [];

    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(100);

    const result = [];
    for (const member of members) {
      const user = await ctx.db.get("users", member.userId);
      result.push({
        ...member,
        userName: user?.name ?? "Unknown",
        userEmail: user?.email ?? "",
      });
    }

    return result;
  },
});

export const add = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: memberFields.role,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId),
      )
      .unique();
    if (!callerMembership || callerMembership.role !== "admin") {
      throw new Error("Only admins can add members");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    if (!targetUser) {
      throw new Error("No user found with that email address");
    }

    const existingMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", targetUser._id),
      )
      .unique();
    if (existingMembership) {
      throw new Error("User is already a member of this project");
    }

    await ctx.db.insert("projectMembers", {
      projectId: args.projectId,
      userId: targetUser._id,
      role: args.role,
    });

    return null;
  },
});

export const updateRole = mutation({
  args: {
    memberId: v.id("projectMembers"),
    role: memberFields.role,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const targetMembership = await ctx.db.get("projectMembers", args.memberId);
    if (!targetMembership) throw new Error("Membership not found");

    const callerMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q
          .eq("projectId", targetMembership.projectId)
          .eq("userId", userId),
      )
      .unique();
    if (!callerMembership || callerMembership.role !== "admin") {
      throw new Error("Only admins can change member roles");
    }

    await ctx.db.patch("projectMembers", args.memberId, { role: args.role });
    return null;
  },
});

export const remove = mutation({
  args: { memberId: v.id("projectMembers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const targetMembership = await ctx.db.get("projectMembers", args.memberId);
    if (!targetMembership) throw new Error("Membership not found");

    const project = await ctx.db.get("projects", targetMembership.projectId);
    if (!project) throw new Error("Project not found");

    if (project.ownerId === targetMembership.userId) {
      throw new Error("Cannot remove the project owner");
    }

    const callerMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q
          .eq("projectId", targetMembership.projectId)
          .eq("userId", userId),
      )
      .unique();

    const isSelfRemoval = targetMembership.userId === userId;
    const isAdmin = callerMembership?.role === "admin";

    if (!isSelfRemoval && !isAdmin) {
      throw new Error("Only admins can remove other members");
    }

    await ctx.db.delete("projectMembers", args.memberId);
    return null;
  },
});
