var db = {};
db.logs = new Mongo.Collection('logs');

if (Meteor.isClient) {

  Template.body.helpers({
    creating: false
  });

  Template.title.events({
    'click button': function () {
      // increment the counter when button is clicked
      Session.set('counter', Session.get('counter') + 1);
    }
  });

  Template.logs.helpers({
    logs: function () {
      return db.logs.find({});
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
