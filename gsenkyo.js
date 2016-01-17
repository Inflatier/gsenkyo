var db = {};
db.logs = new Mongo.Collection('logs');
db.rooms = new Mongo.Collection('rooms');

function Player(name, id) {
  this.id = id;
  this.name = name;
  this.manifestTitle = '';
  this.manifest = '';
  this.data = '';
  this.chart = {
    topic1: {name: '', num: null},
    topic2: {name: '', num: null},
    topic3: {name: '', num: null},
  };
};


if (Meteor.isClient) {
  // グローバル変数のようなもの
  Session.setDefault('user-id', null);
  Session.setDefault('creating-room', false);
  Session.setDefault('is-room-manager', false);
  Session.setDefault('selecting-room', false);
  Session.setDefault('entrying', false);
  Session.setDefault('selectedRoom', null);
  Session.setDefault('password', null);
  Session.setDefault('logged-in', false);
  Session.setDefault('creating-manifest', false);

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
    isRoomManager: function () {
      return Session.get('is-room-manager');
    },
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

  Template.title.helpers({
    logs: function () {
      return db.logs.find({});
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

  Template.createRoom.events({
    'submit form': function (e, template) {
      e.preventDefault();
      var name = template.find('input.name').value;
      var password = template.find('input.password').value;

      var overwrap = db.rooms.findOne({name: name});
      if (overwrap) {
        alert('同じ名前の選挙が存在します。別の名前を使ってください。');
        return;
      }
      db.rooms.insert({
        name: name,
        password: password,
        players: []
      }, function (err) {
        if (err) {
          Session.setPersistent('selectedRoom', null);
          Session.setPersistent('is-room-manager', false);
        }
      });

      Session.setPersistent('selectedRoom', name);
      Session.set('creating-room', false);
      Session.setPersistent('is-room-manager', true);
    },
    'click .cancel': function (e, template) {
      Session.set('creating-room', false);
    }
  });

  Template.manager.helpers({
    room: function () {
      return Session.get('selectedRoom');
    }
  });

  Template.selectRoom.events({
    /**
    * 部屋が選択されたら
    */
    'click li': function (e, template) {
      var roomname = db.rooms.findOne({_id: this._id}).name;
      Session.setPersistent('selectedRoom', roomname);
      Session.set('entrying', true);
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
      Meteor.call('login', roomId, name, password, function (err, userId) {
        if (err) {
          // ログインできなかった
          console.error(err);
        } else {
          // ログインできた
          Session.setPersistent('user-id', userId);
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
      return db.rooms.find({}, {name: 1});
    },
    entrying: function () {
      return (Session.get('entrying')) ? 'entrying' : '';
    },
    room: function () {
      return Session.get('selectedRoom');
    }
  });

  Template.room.helpers({
    room: function () {
      return Session.get('selectedRoom');
    },
    creating: function () {
      return (Session.get('creating-manifest')) ? 'creating' : '';
    },
    player: function () {
      var room = db.rooms.findOne(
        {name: Session.get('selectedRoom')},
        {players: 1});
      for (var i = 0; i < room.players.length; i++) {
        if (room.players[i].id == Session.get('user-id'))
          return room.players[i];
      }
    }
  });

  Template.room.preserve(['input', 'textarea']);

  Template.room.events({
    'click .exit': function () {
      var roomname = Session.get('selectedRoom');
      var id = Session.get('user-id');
      Meteor.call('logout', roomname, id);
      Session.setPersistent('logged-in', false);
    },
    'click button.create': function () {
      Session.set('creating-manifest', true);
    },
    'click button.opendatas': function () {
      window.open("http://www.city.yokohama.lg.jp/seisaku/seisaku/opendata/catalog.html");
    },
    'click button.linkdata': function () {
      window.open("http://linkdata.org/work?sort=date&tag=CITY_140001#workList");
    },
    'click .create-manifest .cancel': function () {
      Session.set('creating-manifest', false);
    }
  });

}

if (Meteor.isServer) {
  // サーバー起動時に挿入されるサンプルデータ
  Meteor.startup(function () {
    db.logs.update({}, {name: 'ここにログが入る予定'}, {upsert: true});
    db.rooms.update({}, {
		name: '部屋の名前',
		password: 'pass',
		players: [],
	}, {upsert: true});

  });

  // name, passwordがあるデータだけが保存できるようにする
  db.rooms.allow({
    insert: function (userId, doc) {
      if (!doc.name) return false;
      if (!doc.password) return false;
      if (!doc.players) return false;
      var nameOverwrap = db.rooms.findOne({name: doc.name});
      if (nameOverwrap != null) return false;
      return true;
    }
  });

  // Meteor.callで呼び出すためのメソッド
  Meteor.methods({
    login: function (roomId, name, password) {
      var room = db.rooms.findOne({name: roomId});
      // 引数の型チェック
      check(roomId, String);
      check(name, String);
      check(password, String);
      check(room.password, String);

      // 名前が0文字ならエラー
      if (name.length == 0) {
        throw new Meteor.Error('Input name');
      }

      // パスワードが一致したら
      if (room.password === password) {
        // ユーザーオブジェクトを作成
        var id = (new Date().getTime()).toString() + (Math.floor(Math.random() * 1000)).toString();
        var player = new Player(name, id);

        db.rooms.update(
          { name: roomId},
          { $push: {'players': player} });

        return id;
      } else {
        throw new Meteor.Error('Wrong password')
      }
    },
    logout: function (roomName, id) {
      db.rooms.update({name: roomName}, {
        $pull: {players: {'id': id} }
      });
    }
  });

  // クライアントにデータベースを公開する

  Meteor.publish('rooms', function () {
    return db.rooms.find({}, {name: 1, password: 0});
  });

  Meteor.publish('logs', function () {
    return db.logs.find({});
  });

}
