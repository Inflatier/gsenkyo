var db = {};
db.logs = new Mongo.Collection('logs');
db.rooms = new Mongo.Collection('rooms');

if (Meteor.isClient) {

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
    'submit': function (e) {
      e.preventDefault();
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
}
