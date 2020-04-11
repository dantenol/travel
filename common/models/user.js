'use strict';

module.exports = function(User) {
  User.beforeRemote('login', function(ctx, data, next) {
    const body = ctx.req.body;
    body.ttl = 31540000;
    next();
  });

  User.validatesUniquenessOf('email', {
    message: '*Email já cadastrado*',
  });

  User.beforeRemote('create', function(ctx, data, next) {
    const body = ctx.req.body;
    if (body.email) body.email = body.email.toLowerCase();
    body.createdAt = new Date();
    next();
  });

  User.beforeRemote('*.__create__lists', function(ctx, data, next) {
    const body = ctx.req.body;
    body.createdAt = new Date();
    body.createdBy = ctx.req.accessToken.userId;
    next();
  });

  User.afterRemote('*.__create__lists', async function(ctx, data) {
    const List = User.app.models.List;
    const lst = await List.findById(data.id, {
      include: ['users', 'destinations'],
    });
    ctx.result = lst;
  });
};
