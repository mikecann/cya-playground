import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),

  projects: defineTable({
    name: v.string(),
    description: v.string(),
    ownerId: v.id("users"),
  }).index("by_ownerId", ["ownerId"]),

  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer"),
    ),
  })
    .index("by_projectId", ["projectId"])
    .index("by_userId", ["userId"])
    .index("by_projectId_and_userId", ["projectId", "userId"]),

  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    projectId: v.id("projects"),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_assigneeId", ["assigneeId"])
    .index("by_projectId_and_status", ["projectId", "status"])
    .index("by_projectId_and_assigneeId", ["projectId", "assigneeId"]),

  comments: defineTable({
    content: v.string(),
    taskId: v.id("tasks"),
    authorId: v.id("users"),
  }).index("by_taskId", ["taskId"]),

  activityLog: defineTable({
    action: v.string(),
    userId: v.id("users"),
    projectId: v.id("projects"),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.string()),
  }).index("by_projectId", ["projectId"]),

  labels: defineTable({
    name: v.string(),
    color: v.string(),
    projectId: v.id("projects"),
  }).index("by_projectId", ["projectId"]),

  taskLabels: defineTable({
    taskId: v.id("tasks"),
    labelId: v.id("labels"),
  })
    .index("by_taskId", ["taskId"])
    .index("by_labelId", ["labelId"])
    .index("by_taskId_and_labelId", ["taskId", "labelId"]),

  platformStats: defineTable({
    totalMutations: v.number(),
  }),
});
