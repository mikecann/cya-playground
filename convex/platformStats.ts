import { query, MutationCtx } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("platformStats").first();
    return stats ?? { totalMutations: 0 };
  },
});

export async function incrementMutationCount(ctx: MutationCtx) {
  const stats = await ctx.db.query("platformStats").first();
  if (stats) {
    await ctx.db.patch("platformStats", stats._id, {
      totalMutations: stats.totalMutations + 1,
    });
  } else {
    await ctx.db.insert("platformStats", { totalMutations: 1 });
  }
}
