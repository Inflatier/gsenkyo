var db = {};
db.logs = new Mongo.Collection('logs');

if (Meteor.isClient) {

  Template.body.helpers({
    creating: function () {
      return Session.get('creating');
    }
  });

  Template.title.events({
    'click button': function () {
      Session.set('counter', Session.get('counter') + 1);
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
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
