var db = {};
db.logs = new Mongo.Collection('logs');
db.rooms = new Mongo.Collection('rooms');


if (Meteor.isClient) {

  Meteor.subscribe('rooms');
  Meteor.subscribe('logs');

  Template.body.helpers({
    creating: function () {
      return Session.get('creating');
    },
    joining: function () {
      return Session.get('joining');
    }
  });

  Template.title.events({
    'click button.join': function () {
      Session.set('joining', true);
    },
    'click button.create': function () {
      Session.set('creating', true);
    }
  });

  Template.logs.helpers({
    logs: function () {
      return db.logs.find({});
    }
  });

  Template.create.events({
    'submit form': function (e, template) {
      e.preventDefault();
      var name = template.find('input.name').value;
      var password = template.find('input.password').value;
      db.rooms.insert({name: name, password: password});
      Session.set('creating', false);
    }
  });

  Template.join.helpers({
    rooms: function () {
      return db.rooms.find({});
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
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
}
