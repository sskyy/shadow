(function(exportor){


  function Messenger( host ){
    this._observers = {}
    _.mixin( this, new Dispatcher() )
    this.socket = null
    this.host = host
    this.setup()
  }

  Messenger.prototype.set = function( attr, data){
    this[attr] = data
    return this
  }


  Messenger.prototype.setup = function(){
    var root = this
    chrome.runtime.onMessage.addListener( function(request, sender, respond) {
      console.log("received tab message", request, sender.tab.id)
      root.fire( "client."+request.cmd, respond, request.data, sender.tab.id)
      return true
    });
  }

  Messenger.prototype.setupSocket = function( respond ){
    var root= this
    root.socket = io.connect(this.host,{reconnection:true,reconnectionDelay:1000})

    root.socket.on('connect',_.once(respond|| _.noop))

    root.socket.on("message",function(msg, letServerKnow){
      root.fire("server.message",letServerKnow|| _.noop, msg)
    })

    root.socket.on("info",function(info, letServerKnow){
      root.fire("server.info",letServerKnow || _.noop, info)
    })

    root.socket.on("err",function(info, letServerKnow){
      root.fire("server.err",letServerKnow || _.noop, info)
    })

    root.socket.on("disconnect",function(){
      console.log("socket disconnected!")
      root.fire("server.disconnect", function(){
        console.log("disconnect all received.")
      })
    })
  }

  Messenger.prototype.status = function(){
    if( !this.socket ){
      return "initial"
    }else{
      return this.socket.connected ? "connected" : "unconnected"
    }
  }

  Messenger.prototype.resetConnect = function(){
    if( this.socket ) this.socket.disconnect()
    this.socket = null
  }

  Messenger.prototype.connect = function( respond ){
    if( !this.socket ){
      this.setupSocket(respond )
    }else{
      if( this.socket.connected ){
        this.socket.disconnect()
      }
      this.socket.connect(this.host)
    }
  }

  Messenger.prototype.disconnect = function(){
    this.socket && this.socket.connected && this.socket.disconnect()
  }

  Messenger.prototype.toServer = function( respond, data){
    console.log("sending message to server", data, this.socket)
    if( !this.socket || !this.socket.connected) return console.log("socket is not connected")
    this.socket.emit(data.cmd,data.data, function(){
      console.log("send message success",arguments)
      respond && respond()
    })
  }

  Messenger.prototype.toClient = function( respond, data){
    console.log("dispatch message to tab", data.tabId)
    chrome.tabs.sendMessage(parseInt(data.tabId), data, function(){
      console.log("client ", data.tabId, "received the message");
      respond && respond()
    });
  }


  exportor.Messenger = Messenger

})(this)