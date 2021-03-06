(function(exportor){


  function Chat( messenger, injector ) {
    this.injector = injector
    this.insertedTabs = {}
    this.roomTabMap = {}
    this.tabRoomMap = {}
    this.user = null
    this.currentTab = null
    this.config = {
      //host : 'http://chat.zerojs.io:3002',
      host : 'http://127.0.0.1:3000',
      chat: {
        //this was used to generate qiniu uptoken
        host : 'http://chat.zerojs.io:3002',
        //host : 'http://127.0.0.1:3000',
        mode: 'full',
        autoReconnect: true,
        locked : false
      },
      mark: {
        host : 'http://chat.zerojs.io:3002',
        visible: false,
        controlKeyCode : /AppleWebKit/.test(navigator.userAgent) ? 91 : 17
      },
      scanner : true,
      auto: false
    }
    this.messenger = messenger.set('host',this.config.host)

    console.log( /AppleWebKit/.test(navigator.userAgent),"isApple")

    this.setup()
  }

  Chat.prototype.login = function(user, cb){
    var root = this
    return $.ajax({url:this.config.host+"/user/login",type:"POST",data:user}).then(function( loggedUser){
      root.user = loggedUser
      console.log("client logged in, calling callbacks")

      if( root.messenger.status() == "initial"){
        root.messenger.connect(cb)
      }else{
        cb&&cb()
      }
    }).fail(function( res ){
      console.log("login failed", arguments)
      cb&&cb( {err:"login failed", code:res.status} )
    })
  }

  Chat.prototype.register = function(user, cb){
    var root = this
    return $.ajax({url:this.config.host+"/user/register",type:"POST",data:user}).then(function( savedUser){
      root.user = savedUser
      console.log("client registered, calling callbacks")

      if( root.messenger.status() == "initial"){
        root.messenger.connect(cb)
      }else{
        cb&&cb()
      }
    }).fail(function( res ){
      console.log("register failed", arguments)
      cb&&cb( res )
    })
  }

  Chat.prototype.connect = function(cb){
    var root = this
    if( !root.user ) return cb({err:"user not logged in",code:401})

    if( root.messenger.status() != "connected"){
      root.messenger.connect(cb)
    }else{
      cb&&cb()
    }
  }

  Chat.prototype.getUser = function(cb){
    var root = this

    if( root.user === null){
      $.ajax(root.config.host+'/user/me', {
        type: "POST",
        xhrFields: {
          withCredentials: true
        },
        crossDomain: true
      }).then(function( user ){
        console.log("user already logged in")
        root.user = user
        root.connect(cb)
      }).fail(function(res){
        //mark here, mean we have send this request once.
        console.log("get user failed", res)
        cb&&cb({err:"user not logged in",code:res.status})
      })
    }else{
      root.connect(cb)
    }
  }

  Chat.prototype.logout = function( cb ){
    var root = this
    return $.ajax({url:this.config.host+"/user/logout",
      type: "POST",
      xhrFields: {
        withCredentials: true
      },
      crossDomain: true
    }).then(function(){
      root.user = null
      root.disconnect()
      cb && cb()
    })
  }

  Chat.prototype.changeRoom = function( respond, room, tabId){
    var root = this
    if( root.tabRoomMap[tabId] ){
      root.roomTabMap[root.tabRoomMap[tabId]] = _.without( root.roomTabMap[root.tabRoomMap[tabId]], tabId )
      if(root.roomTabMap[root.tabRoomMap[tabId]].length==0){
        delete root.roomTabMap[root.tabRoomMap[tabId]]
      }
    }
    root.roomTabMap[room] = _.union(root.roomTabMap[room]||[],[tabId])
    root.tabRoomMap[tabId] = room

    console.log("tab changed room",tabId, root.roomTabMap, root.tabRoomMap)
    root.messenger.toServer(respond, {cmd:'join',data:room})
  }


  Chat.prototype.setup = function(){
    var root = this



    root.messenger.on("client.login",function( respond, user){
      root.login( user, function(err){
        console.log("login sending respond to tab", err, root.user)
        respond( err )
      })
    })

    root.messenger.on("client.register",function( respond, user){
      root.register( user, function(err){
        console.log("register sending respond to tab", root.user)
        respond( err || root.user )
      })
    })

    root.messenger.on("client.logout",function( respond){
      root.logout(function(){
        respond()
      })
    })

    root.messenger.on("client.connect", function( respond, room, tabId ){
      root.getUser(function(err){
        if( err ) return respond(err)

        root.changeRoom( respond.bind(respond,root.user),room,tabId)
      })
    })

    root.messenger.on("client.disconnect", function(respond, data, tabId){
      root.remove(tabId)
    })

    root.messenger.on("client.message", function( respond, msg, tabId ){
      root.messenger.toServer( respond, {cmd:"message",data:msg, tabId:tabId} )
    })

    root.messenger.on("client.join", root.changeRoom.bind(root))

    root.messenger.on("client.config.get", function( respond){
      console.log("getting config", root.config)
      respond(_.cloneDeep(root.config))
    })

    root.messenger.on("client.config.set", function( respond, config){
      console.log("changing config",config)
      root.config =_.merge(root.config, config)
      respond(_.cloneDeep(root.config))
      console.log("config changed",root.config)
      root.broadcast("config.set",root.config, _.noop)
    })


    root.messenger.on("server.message", function( respond, msg ){
      if( msg.to ){
        root.messenger.toClient( respond, {cmd:"message",data:msg, tabId:root.currentTab} )
      }else{
        console.log("sending message to room", root.roomTabMap)
        root.roomTabMap[msg.room].forEach(function( tabId){
          root.messenger.toClient( respond, {cmd:"message",data:msg, tabId:tabId} )
        })
      }
    })

    root.messenger.on("server.info",function( respond, info){
      console.log("get info from server")
      if( info.code && info.code==403){
        console.log("need to login")
        root.reset()
      }else{
        root.broadcast("info",info)
      }
    })

    root.messenger.on("server.disconnect", function(respond){
      console.log("server disconnect!!!")
      root.disconnect()
      respond()
    })

  }

  Chat.prototype.broadcast = function( msg, data, cb ){
    var root = this
    Object.keys(root.insertedTabs).forEach(function(tabId){
      root.messenger.toClient(cb,{cmd:msg,data:data, tabId:tabId})
    })
  }

  Chat.prototype.disconnect = function(){
    var root = this
    _.forEach(root.insertedTabs,function(n, tabId){
      root.messenger.toClient(_.noop,{tabId:tabId,cmd:"disconnect"})
    })
  }

  Chat.prototype.reset = function(){
    var root = this
    root.messenger.resetConnect()
    root.user = false
    _.forEach(root.insertedTabs,function(n, tabId){
      root.messenger.toClient(_.noop,{tabId:tabId,cmd:"reset"})
    })
  }

  Chat.prototype.inject = function( whatToInject, tabId, type){
    console.log("deal with inject", tabId, type)
    var root = this
    if( whatToInject == 'app'){
      root.currentTab = tabId
      type = type || "auto"

      if( root.insertedTabs[tabId] && type!=='reload' ) return console.log( tabId, "already injected.")

      //whether auto inject depend on chat.auto
      if( type== "force" || (root.insertedTabs[tabId] && type=="reload" ) || !root.insertedTabs[tabId]){
        root.injector.inject("app", tabId, function(){
          root.insertedTabs[tabId] = true
        })
      }
    }else{
      //inject scanner
      root.injector.inject(whatToInject, tabId, _.noop)
    }

  }

  Chat.prototype.remove = function( tabId){
    delete this.insertedTabs[tabId]

    if( Object.keys( this.insertedTabs).length == 0 ){
      this.messenger.disconnect()
    }
  }

  exportor.Chat = Chat

})(this)