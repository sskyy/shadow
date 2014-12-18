angular.module("index",['chat','mark'])
  .directive("index",function( messenger, config){
  return {
    restrict : "EA",
    templateUrl : "modules/index/index.html",
    compile : function( $ele){
      $ele.css({
        position : "absolute",
        top : 0,
        left:0
      })


      var parsedConfig = JSON.parse($ele.attr("index"))

      $ele.find("[chat]").attr("chat",JSON.stringify(parsedConfig.chat ))
      $ele.find("[mark-container]").attr("mark-container",JSON.stringify(parsedConfig.mark ))
      config(parsedConfig)

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
  .directive("window",function(){
    return {
      restrict : "EA",
      link:function(scope, $ele, $attrs ){
        var fullHehgit =  window.innerHeight -30
        var fullWidth =  500

        var mode = $attrs['window']

        var $overview = $ele.find('[window-overview]')
        var $body = $ele.find('[window-body]')
        var $handlers= $ele.find('[window-handlers]')

        //$ele.find('[window-handler-close]')
        $ele.find('[window-handler-minimal]').click(minimalMode)
        $ele.find('[window-handler-full]').click(fullMode)
        $ele.find('[window-handler-full-trigger]').click(fullMode)
        $ele.find('[window-handler-close]').click(close)

        function fullMode(e,silent){
          $ele.attr("window","full")
          $ele.height( fullHehgit)
          !silent && $ele.trigger('full')
        }

        function minimalMode(e,silent){
          $ele.attr("window","min")
          console.log(silent,"silent")
          !silent && $ele.trigger('minimal')
        }

        function close(){
          $ele.trigger('close')
          $ele.remove()
        }

        (mode=='full') ? fullMode(null,true) : minimalMode(null,true)

      }
    }

  })
  .directive("configSetter",function(config, messenger){
    function getRef( obj, name ){
      var ns = name.split('.'),
        ref = obj,
        currentName

      while( currentName = ns.shift() ){
        if(_.isObject(ref) && ref[currentName]){
          ref = ref[currentName]
        }else{
          ref = undefined
          break;
        }
      }

      return ref
    }


    function setRef( obj, name, data){

      var ns = name.split('.'),
        ref = obj,
        currentName

      while( currentName = ns.shift() ){
        if( ns.length == 0 ){
          if( _.isObject(ref[currentName] )){
            _.merge(ref[currentName], data)

          }else{
            if( ref[currentName] !== undefined ) console.log("you are changing a exist data",name)
            ref[currentName] = data
          }

        }else{
          if( !_.isObject(ref[currentName])) {
            if( ref[currentName] !== undefined ) console.log("your data will be reset to an object",currentName)
            ref[currentName] = {}
          }
          ref = ref[currentName]
        }
      }

    }

    return {
      scope : {
        trueValue : "@",
        falseValue : "@"
      },
      link : function( $scope, $ele, $attrs){
        var currentConfig = config()
        var item = $attrs['configSetter']
        var itemValue = getRef( currentConfig, item )
        var trueValue  = $scope.trueValue || true
        var falseValue = $scope.falseValue || false
        var checked = itemValue==trueValue
        var $checkbox = $("<input type='checkbox'>")
        var $label = $("<label></label>").append( $ele[0].innerHTML )

        $checkbox.attr("checked",checked)
        $ele[0].innerHTML = ""
        $ele.append($checkbox).append($label)

        $ele.click(function sendChangeRequest(){
          checked = !checked
          setRef( currentConfig, item, checked?trueValue:falseValue )
          console.log( JSON.stringify(currentConfig),"currentConfig")
          messenger.fire("config.set", currentConfig)
          $checkbox.attr("checked",checked)
        })
      }
    }
  })
  .directive("autoScroll",function( $rootScope){
    return function( $scope, $ele, $attrs){
      $attrs['autoScroll'].split(',').forEach(function( event){
        $rootScope.$on( event,function(){
          window.setTimeout(function(){
            $ele.animate({
              scrollTop : $ele[0].scrollHeight - $ele[0].clientHeight
            },'fast')
          },100)
        })
      })
    }
  })
  .service("config",function( messenger ){
    var config = null

    messenger.on("config.set",function( newConfig ){
      config = newConfig
    })

    return function( data ){
      return data? (config=data) : config
    }
  })
