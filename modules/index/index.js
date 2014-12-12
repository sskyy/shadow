angular.module("index",['chat','mark'])
  .value('host','http://127.0.0.1:3000')
  .directive("index",function( messenger){
  return {
    restrict : "EA",
    templateUrl : "modules/index/index.html",
    compile : function( $ele){
      $ele.css({
        position : "absolute",
        top : 0,
        left:0
      })


      var config = JSON.parse($ele.attr("index"))

      $ele.find("[chat]").attr("chat",JSON.stringify(config.chat ))
      $ele.find("[mark-container]").attr("mark-container",JSON.stringify(config.mark ))


      return function( $scope, $ele ){

        function generateConfigSetter(data){
          return function(){
            console.log( "config.set",data)
            messenger.fire("config.set",data, function(){
              console.log("config set", arguments)
            })
          }
        }

        $ele.on('minimal',generateConfigSetter({chat:{mode:'minimal'}}))
        $ele.on('full',generateConfigSetter({chat:{mode:'full'}}))
        $ele.on('close',function(){
          $ele.remove()
          generateConfigSetter({auto:false})()
          messenger.fire("disconnect",null, function(){
            console.log("disconnected", arguments)
          })
        })

        $ele.on('mark.switch',function( e, mode ){
          console.log("setting mark mode", mode)
          generateConfigSetter({mark:{mode:mode}})()
        })

      }
    }
  }
}).service("messenger", function(){

    var messenger = new Dispatcher()


    function Dispatcher(){
      this._observers = {}
    }

    Dispatcher.prototype.fire = function(cmd , data, respond){
        console.log("sending message to server", cmd, data )
        chrome.runtime.sendMessage({cmd: cmd, data:data}, respond);
    }

    Dispatcher.prototype.on = function( cmd, handler ){
      this._observers[cmd] = (this._observers[cmd]||[]).concat(handler)
    }

    chrome.runtime.onMessage.addListener(function(request, sender, respond) {
      console.log('message received from server', request)
      if(!messenger._observers[request.cmd]) return console.log("no handler on this cmd",request.cmd)
      messenger._observers[request.cmd].forEach(function( handler){
        handler( request.data )
      })
      respond()
      return true
    });

    return messenger
  })