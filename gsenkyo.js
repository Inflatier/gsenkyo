var db = {};
db.logs = new Mongo.Collection('logs');
db.rooms = new Mongo.Collection('rooms');


if (Meteor.isClient) {
  Session.setDefault('creating-room', false);
  Session.setDefault('selecting-room', false);
  Session.setDefault('entrying', false);
  Session.setDefault('selectedRoom', null);
  Session.setDefault('password', null);
  Session.setDefault('logged-in', false);

  // データベースにアクセスできるようにする
  Meteor.subscribe('rooms');
  Meteor.subscribe('logs');

  /**
  * テンプレート内の"{{ヘルパー名}}"でアクセスできる値を設定する
  *
  * Template.テンプレート名.helpers({
  *    ヘルパー名: 値
  *  })
  *
  *
  * テンプレート内で起きたイベントを処理する
  *
  * Template.テンプレート名.events({
  *    'イベント名 CSSセレクタ': 関数(event, template) {
  *      template.find('#CSSセレクタ')
  *    }
  *  })
  */

  Template.body.helpers({
    creatingRoom: function () {
      return Session.get('creating-room');
    },
    selectingRoom: function () {
      return Session.get('selecting-room');
    },
    loggedIn: function () {
      return Session.get('logged-in');
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
    /**
    * 部屋が選択されたら
    */
    'click li': function (e, template) {
      Session.set('entrying', true);
      Session.set('selectedRoom', this._id);
    },

    /**
    * '参加'の処理
    */
    'submit form': function (e, template) {
      // 画面のリロードを防ぐ
      e.preventDefault();

      var roomId = Session.get('selectedRoom');
      var name = template.find('input.name').value;
      var password = template.find('input.password').value;

      // Meteor.methodsで定義したメソッドloginを呼び出し
      Meteor.call('login', roomId, name, password, function (err) {
        if (err) {
          // ログインできなかった
          console.error(err);
        } else {
          // ログインできた
          Session.setPersistent('logged-in', true);
          Session.setPersistent('password', password);
          Session.set('selecting-room', false);
          Session.set('entrying', false);
        }
      });
    },
    'click .cancel': function () {
      Session.set('entrying', false);
    }
  });

  Template.selectRoom.helpers({
    rooms: function () {
      return db.rooms.find({}, {name: 1, password: 0});
    },
    entrying: function () {
      return (Session.get('entrying')) ? 'entrying' : '';
    },
    room: function () {
      var roomId = Session.get('selectedRoom');
      var room = db.rooms.findOne({_id: roomId});
      return (room) ? room.name : '';
    }
  });

}

if (Meteor.isServer) {

  // サーバー起動時に挿入されるサンプルデータ
  Meteor.startup(function () {
    db.logs.update({}, {name: 'ここにログが入る予定'}, {upsert: true});
    db.rooms.update({}, {name: '部屋の名前', password: 'pass'}, {upsert: true});
  });

  // name, passwordがあるデータだけが保存できるようにする
  db.rooms.allow({
    insert: function (userId, doc) {
      if (!doc.name) return false;
      if (!doc.password) return false;
      return true;
    }
  });

  // Meteor.callで呼び出すためのメソッド
  Meteor.methods({
    login: function (roomId, name, password) {
      var room = db.rooms.findOne({_id: roomId});
      // 引数の型チェック
      check(roomId, String);
      check(name, String);
      check(password, String);
      check(room.password, String);

      // 名前が0文字ならエラー
      if (name.length == 0) {
        throw new Meteor.Error('Input name');
      }

      if (room.password === password) {
        return 'Login successful';
      } else {
        throw new Meteor.Error('Wrong password')
      }
    }
  });

  // クライアントにデータベースを公開する

  Meteor.publish('rooms', function () {
    return db.rooms.find({});
  });

  Meteor.publish('logs', function () {
    return db.logs.find({});
  });

}
