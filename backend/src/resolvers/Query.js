const Query = {
  async items(arent, args, ctx, info) {
    const items = await ctx.db.query.items();
    return items;
  },
};

module.exports = Query;
