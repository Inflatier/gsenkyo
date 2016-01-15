var db = {};
db.logs = new Mongo.Collection('logs');
db.rooms = new Mongo.Collection('rooms');


if (Meteor.isClient) {
  Session.setDefault('creating-room', false);
  Session.setDefault('selecting-room', false);
  Meteor.subscribe('rooms');
  Meteor.subscribe('logs');

  Template.body.helpers({
    creatingRoom: function () {
      return Session.get('creating-room');
    },
    selectingRoom: function () {
      return Session.get('selecting-room');
    }
  });

  Template.title.events({
    'click button.join': function () {
      Session.set('selecting-room', true);
    },
    'click button.create': function () {
      Session.set('creating-room', true);
    }
  });

  Template.logs.helpers({
    logs: function () {
      return db.logs.find({});
    }
  });

  Template.createRoom.events({
    'submit form': function (e, template) {
      e.preventDefault();
      var name = template.find('input.name').value;
      var password = template.find('input.password').value;
      db.rooms.insert({name: name, password: password});
      Session.set('creating-room', false);
    }
  });

  Template.selectRoom.events({
    'click li': function (e, template) {
      Session.set('entrying', true);
      Session.set('selectedRoom', this._id);
    },
    'click .cancel': function () {
      Session.set('entrying', false);
    }
  });

  Template.selectRoom.helpers({
    rooms: function () {
      return db.rooms.find({}, {name: 1});
    },
    entrying: function () {
      return (Session.get('entrying')) ? 'entrying' : '';
    },
    room: function () {
      var room = db.rooms.findOne(
        {_id: Session.get('selectedRoom')});
      return (room) ? room.name : '';
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    db.logs.update({}, {name: 'ここにログが入る予定'}, {upsert: true});
    db.rooms.update({}, {name: '部屋の名前', password: 'PASSWORD_NO_JAPANESE'}, {upsert: true});
  });

db.rooms.allow({
  insert: function (userId, doc) {
    if (!doc.name) return false;
    if (!doc.password) return false;
    return true;
  }
});

  Meteor.publish('rooms', function () {
    return db.rooms.find({});
  });

  Meteor.publish('logs', function () {
    return db.logs.find({});
  });
}
