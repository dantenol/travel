'use strict';

module.exports = function(Invite) {
  Invite.beforeRemote('create', function(ctx, data, next) {
    const body = ctx.req.body;
    if (body.email) body.email = body.email.toLowerCase();
    body.sentBy = ctx.req.accessToken.userId;
    body.createdAt = new Date();
    next();
  });

  Invite.afterRemote('create', async function(ctx, data) {});

  Invite.answer = async function(req, id, answer) {
    const User = Invite.app.models.User;
    const inv = await Invite.findById(id);
    if (!inv) {
      throw 'Invite not found';
    }

    const usr = await User.findById(req.accessToken.userId);
    console.log(inv, usr);
    if (!usr) {
      throw 'User not found';
    }

    if (answer) {
      usr.lists.add(inv.listId);
    }
    await inv.destroy();
    return true;
  };

  Invite.remoteMethod('answer', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'id', type: 'string', required: true},
      {arg: 'answer', type: 'boolean', required: true},
    ],
    description: 'Answer a list invite',
    returns: {root: true},
    http: {path: '/:id/answer', verb: 'put'},
  });
};
