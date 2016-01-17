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
  this.voted = 0;
  this.didVote = false;
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
  Session.setDefault('viewing-manifests', false);
  Session.setDefault('selectedCandidate', null);
  Session.setDefault('viewing-manifest', false);
  Session.setDefault('voting', false);

  Session.setDefault('start-voting',false);
  Session.setDefault('stop-voting', false);

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
    },
    finished: function () {
      var roomName = Session.get('selectedRoom');
      if (roomName) {
        var room = db.rooms.findOne({name: roomName});
        if (room) return room.finished;
      }
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

      Meteor.call('createRoom', name, password, function (err, manageId) {
        if (err) {
          alert(err.error);
          Session.setPersistent('selectedRoom', null);
          Session.setPersistent('is-room-manager', false);
        } else {
          Session.setPersistent('selectedRoom', name);
          Session.set('creating-room', false);
          Session.setPersistent('manager-id', manageId);
          Session.setPersistent('is-room-manager', true);
        }
      });

    },
    'click .cancel': function (e, template) {
      Session.set('creating-room', false);
    }
  });

  Template.manager.helpers({
    room: function () {
      return Session.get('selectedRoom');
    },
    viewing: function () {
      return (Session.get('viewing-manifests')) ? 'viewing' : '';
    },
    selected: function () {
      return (Session.get('viewing-manifest')) ? 'selected' : '';
    },
    candidates: function () {
      var room = db.rooms.findOne({name: Session.get('selectedRoom')});
      if (room) return room.players;
    },
    candidate: function () {
      return Session.get('selectedCandidate');
    },
    started: function () {
      return (Session.get('start-voting')) ? 'started' : '';
    },
    stopped: function () {
      return (Session.get('stop-voting')) ? 'stopped' : '';
    }
  });

  Template.manager.events({
    'click button.view-manifests': function () {
      Session.set('viewing-manifests', true);
    },
    'click .view-manifests button.back': function () {
      Session.set('viewing-manifests', false);
    },
    'click .manifests li': function (e, template) {
      Session.set('selectedCandidate', this);
      Session.set('viewing-manifest', true);
    },
    'click .manifest button.back': function () {
      Session.set('viewing-manifest', false);
      Session.set('selectedCandidate', null);
    },
    'click button.start-voting': function () {
      if (Session.equals('start-voting', true)) return;
      Session.setPersistent('start-voting', true);
      var roomName = Session.get('selectedRoom');
      Meteor.call('startVoting', roomName);
    },
    'click button.stop-voting': function () {
      if (!Session.equals('start-voting', true)) return;
      Session.setPersistent('stop-voting', true);
      var roomName = Session.get('selectedRoom');
      Meteor.call('stopVoting', roomName);
    },
    'click button.destroy-room': function () {
      var managerId = Session.get('manager-id');
      var roomName = Session.get('selectedRoom');
      Meteor.call('destroyRoom', roomName, managerId, function (err, result) {
        if (err) {
          console.error(err);
        } else {
          alert(result);
        }
        Session.setPersistent('is-room-manager', false);
        Session.setPersistent('selectedRoom', null);
        Session.setPersistent('manager-id', null);
        Session.clearPersistent();
      });
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
          alert(err.error);
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
    viewing: function () {
      return (Session.get('viewing-manifests')) ? 'viewing' : '';
    },
    selected: function () {
      return (Session.get('viewing-manifest')) ? 'selected' : '';
    },
    player: function () {
      var room = db.rooms.findOne(
        {name: Session.get('selectedRoom')},
        {players: 1});
      if (!room) return;
      if (!room.players) return;
      for (var i = 0; i < room.players.length; i++)
        if (room.players[i].id == Session.get('user-id'))
          return room.players[i];
    },
    candidates: function () {
      var room = db.rooms.findOne({name: Session.get('selectedRoom')});
      if (room) return room.players;
    },
    candidate: function () {
      return Session.get('selectedCandidate');
    },
    votable: function () {
      var room = db.rooms.findOne({name: Session.get('selectedRoom')});
      if (room) return (room.voting) ? 'votable' : '';
    },
    voting: function () {
      return (Session.get('voting')) ? 'voting' : '';
    },
    candidates_vote: function () {
      var room = db.rooms.findOne({name: Session.get('selectedRoom')});
      if (room)
        return room.players.filter(function (player) {
          return (player.id != Session.get('user-id'));
        });
    },
    candidate_vote: function () {
      return Session.get('selectedCandidate');
    },
    finished: function () {
      var room = db.roms.findOne({name: Session.get('selectedRoom')});
      if (room)
        return room.finished;
    }
  });

  Template.room.events({
    'click .exit': function () {
      var roomname = Session.get('selectedRoom');
      var id = Session.get('user-id');
      Meteor.call('logout', roomname, id);
      Session.setPersistent('logged-in', false);
    },
    'click button.create': function (e, template) {
      Session.set('creating-manifest', true);
      var title = template.find('.manifest-title');
      var body = template.find('.manifest-body');
      var room = db.rooms.findOne({name: Session.get('selectedRoom')}, {players: 1});
      var player = (function () {
        for (var i = 0; i < room.players.length; i++)
          if (room.players[i].id == Session.get('user-id'))
            return room.players[i];
      })();
      title.value = player.manifestTitle;
      body.value = player.manifest;
    },
    'click button.view': function () {
      Session.set('viewing-manifests', true);
    },
    'click .view-manifests button.back': function () {
      Session.set('viewing-manifests', false);
    },
    'click .manifests li': function (e, template) {
      Session.set('selectedCandidate', this);
      Session.set('viewing-manifest', true);
    },
    'click .manifest button.back': function () {
      Session.set('viewing-manifest', false);
      Session.set('selectedCandidate', null);
    },
    'click button.opendatas': function () {
      window.open("http://www.city.yokohama.lg.jp/seisaku/seisaku/opendata/catalog.html");
    },
    'click button.linkdata': function () {
      window.open("http://linkdata.org/work?sort=date&tag=CITY_140001#workList");
    },
    'click .create-manifest .cancel': function () {
      Session.set('creating-manifest', false);
    },
    'submit form': function (e, template) {
      e.preventDefault();
      var roomName = Session.get('selectedRoom');
      var id = Session.get('user-id');
      var manifestTitle = template.find('.manifest-title').value;
      var manifestBody = template.find('.manifest-body').value;
      Meteor.call('post', roomName, id, manifestTitle, manifestBody);
      Session.set('creating-manifest', false);
    },
    'click button.vote.votable': function () {
      var room = db.rooms.findOne({name: Session.get('selectedRoom')})
      if (room) {
        for (var i = 0; i < room.players.length; i++) {
          if (room.players[i].id == Session.get('user-id')) {
            if (room.players[i].didVote == false) {
              Session.set('voting', true);
            } else {
              alert('既に投票済みです');
            }
          }
        }
      }
    },
    'click .polling button.back': function () {
      Session.set('voting', false);
    },
    'click .polling .candidates li': function () {
      if (confirm(this.name + 'に投票しますか?')) {
        Meteor.call('vote', Session.get('selectedRoom'), Session.get('user-id'), this.id);
        Session.set('voting', false);
      }
    }
  });

  Template.result.helpers({
    winners: function () {
      var room = db.rooms.findOne(Session.get('selectedRoom'));
      if (room) {
        var players = room.players.sort(function (a, b) {
          return a.voted > b.voted;
        });
        return players;
      }
    }
  });

}

if (Meteor.isServer) {
  // サーバー起動時に挿入されるサンプルデータ
  Meteor.startup(function () {
    /*
    db.logs.update({}, {name: 'ここにログが入る予定'}, {upsert: true});
    db.rooms.update({}, {
		name: '部屋の名前',
		password: 'pass',
		players: [],
	}, {upsert: true});*/
  });

  // name, passwordがあるデータだけが保存できるようにする
  db.rooms.allow({
    update: function (userId, doc, fieldName, modifier) {
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
        throw new Meteor.Error('パスワードが間違っています')
      }
    },
    logout: function (roomName, id) {
      db.rooms.update({name: roomName}, {
        $pull: {players: {'id': id} }
      });
    },
    'post': function (roomName, id, manifestTitle, manifestBody) {
      db.rooms.update(
        {
          name: roomName,
          'players.id': id
        },
        {$set:
          {
            'players.$.manifest': manifestBody,
            'players.$.manifestTitle': manifestTitle
          }
        });
    },
    'createRoom': function (name, password) {
      check(name, String);
      check(password, String);
      if (!name) throw new Meteor.Error('名前がないやん');
      if (!password) throw new Meteor.Error('パスワードないやん');

      var nameOverwrap = db.rooms.findOne({name: name});
      if (nameOverwrap) throw new Meteor.Error('同じ名前の部屋が既に存在します。')

      var id = (new Date().getTime()).toString() + (Math.floor(Math.random() * 1000)).toString();

      db.rooms.insert({
        name: name,
        password: password,
        managerId: id,
        voting: false,
        finished: false,
        players: []
      });

      return id;
    },
    'destroyRoom': function (name, managerId) {
      var room = db.rooms.findOne({name: name});
      if (room.managerId == managerId) {
        db.rooms.remove({name: name});
        return name + 'を削除しました。'
      } else {
        throw new Meteor.Error('不正なアクセスだゾ');
      }
    },
    'startVoting': function (roomName) {
      db.rooms.update({name: roomName}, { $set: {voting: true} });
    },
    'stopVoting': function (roomName) {
      db.rooms.update({name: roomName}, { $set: {voting: false, finished: true} });
    },
    'vote': function (roomName, from, to) {
      // 投票された側のvoteの値を1増やす
      db.rooms.update(
        {
          name: roomName,
          'players.id': to
        },
        {$inc: { 'players.$.voted': 1 } });
      // 投票下側のdidVoteをtrueに
      db.rooms.update(
        {
          name: roomName,
          'players.id': from
        },
        {$set: { 'players.$.didVote': true} });
    }
  });

  // クライアントにデータベースを公開する

  Meteor.publish('rooms', function () {
    return db.rooms.find({}, {name: 1, players: 1, password: 0});
  });

  Meteor.publish('logs', function () {
    return db.logs.find({});
  });

}
