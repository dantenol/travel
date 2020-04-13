'use strict';

module.exports = function(List) {
  List.disableRemoteMethodByName('prototype.__delete__destinations');
  List.disableRemoteMethodByName('prototype.__findById__destinations');
  List.disableRemoteMethodByName('prototype.__count__destinations');

  List.beforeRemote('*.__create__destinations', async function(ctx) {
    const thisList = await List.findById(ctx.req.params.id);
    thisList.updateAttributes({modifiedAt: new Date()});
    const body = ctx.req.body;
    body.createdAt = new Date();
    body.createdBy = ctx.req.accessToken.userId;
    return;
  });

  List.afterRemote('*.__destroyById__destinations', async function(ctx) {
    const thisList = await List.findById(ctx.req.params.id);
    thisList.updateAttributes({modifiedAt: new Date()});
    return;
  });

  List.afterRemote('*.__updateById__destinations', async function(ctx) {
    const thisList = await List.findById(ctx.req.params.id);
    thisList.updateAttributes({
      modifiedAt: new Date(),
      lastModifiedBy: ctx.req.accessToken.userId,
    });
    return;
  });

  List.getPublicList = async function(id) {
    const thisList = await List.findById(id, {
      include: ['users', 'destinations'],
    });
    if (!thisList.isPublic) {
      throw 'Acesso negado!';
    }

    const jsoned = thisList.toJSON();
    jsoned.users = [jsoned.users[0]];
    return jsoned;
  };

  List.remoteMethod('getPublicList', {
    accepts: [{arg: 'id', type: 'string', required: true}],
    description: 'View a public list',
    returns: {root: true},
    http: {path: '/public/:id', verb: 'get'},
  });
};
