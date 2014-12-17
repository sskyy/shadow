angular.module('chat', ['inlineattachment','ngSanitize']).config(function($sceDelegateProvider){
  $sceDelegateProvider.resourceUrlWhitelist(["self"])
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
          $ele.height( fullHehgit )
          $ele.width( fullWidth)
          $body.css("display","flex")
          $handlers.show()
          $overview.hide()
          !silent && $ele.trigger('full')
        }

        function minimalMode(e,silent){
          $ele.height( 35 )
          $ele.width( 'auto' )
          $body.hide()
          $handlers.hide()
          $overview.show()
          if( $attrs['onMinimal'] ){
            $scope.$parent.$apply(function( parentModel){
              parentModel[$attrs['onFull']]()
            })
          }
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
  .directive("chat",function(){
    return {
      restrict : "EA",
      templateUrl : 'modules/chat/chat.html',
      transclude : true,
      controller : function ( $scope,$http, messenger,$attrs ) {

        var socket,
          roomUser = {
            id: 0,
            name : '公共频道'
          },
          config = JSON.parse($attrs['chat'])

        console.log("current config", config)
        $scope.connected = false
        $scope.room = config.locked || location.href.replace(/\?.*$/, "")
        $scope.user = {}
        $scope.locked = Boolean(config.locked)
        $scope.auto = config.auto
        $scope.messages = []
        $scope.status = 0
        $scope.conversations = {}
        $scope.currentConversation = null
        $scope.content = ""

        $scope.join = function(room){
          $scope.room = room
          messenger.fire('join',room, _.noop)
        }

        $scope.toggleLock = function(locked){
          messenger.fire('config.set',{chat:{locked:locked?$scope.room:false}})
        }

        $scope.toggleAuto = function(auto){
          messenger.fire('config.set',{chat:{auto:auto}})
        }

        $scope.connect = function(silent){
          messenger.fire('connect', $scope.room ,function( user ){
            if( !user || user.err ){
              !silent && ($scope.error = user)
              return console.log("user not logged in", user)
            }

            $scope.$apply(function(){
              $scope.user = user
              $scope.connected = true
              if( $scope.status == 0 ){
                setupMessenger()
                $scope.status = 1
              }

              $scope.changeConversation(roomUser)
            })
          })
        }

        function setupMessenger(){
          console.log("setting up messenger")

          messenger.on("message", function( msg){
            $scope.$apply(function() {
              $scope.receive( msg )
            })
          })

          messenger.on("reset",function(){
            $scope.connected = false
            $scope.user = {}
          })

          messenger.on("disconnect",function(){
            $scope.$apply(function(){
              $scope.connected = false
              console.log("socket disconnected")
            })
          })
        }

        $scope.reconnect = function(){
          messenger.fire("reconnect")
        }

        $scope.receive = function( msg ){
          var from = msg.to ? msg.from : roomUser

          if( msg.to ){
            //private conversation
            if( !$scope.conversations[msg.from.id]) $scope.setConversation(msg.from)
          }

          $scope.conversations[from.id].messages.push( msg )
          if( $scope.currentConversation.user.id !== from.id ){
            $scope.conversations[from.id].unread ++
          }

          $scope.$emit('message.received')
        }

        $scope.send = function( content ){
          if( !content.replace(/\t\s\n/g, "").length ) return
          var msg = {content:content,room:$scope.room}
          if( $scope.currentConversation.user.id !== roomUser.id ) msg.to = $scope.currentConversation.user

          messenger.fire("message", msg, function(){
            $scope.$apply(function(){
              console.log("message send success")
              msg.from = {"name":"me"}
              $scope.currentConversation.messages.push(msg)
              $scope.$emit('message.sent')
              $scope.content = ""
            })
          })
        }

        $scope.login = function( user ){
          messenger.fire("login", user, function(err){
            $scope.$apply(function() {
              if( err ){
                $scope.error = err
                return console.log( "user login failed", err)
              }

              console.log("i logged in!")
              $scope.connect()
            })
          })
        }

        $scope.logout = function(){
          messenger.fire("logout", null, function(){
            $scope.$apply(function(){
              console.log("i logged out!")
              $scope.user = {}
            })
          })
        }

        $scope.register = function(user){
          messenger.fire("register", user, function( err ){
            $scope.$apply(function(){
              if( err ){
                $scope.error = err
                return console.log( "user register failed", err)
              }

              console.log("i registered!")
              $scope.connect()
            })
          })
        }

        $scope.setConversation = function( user) {
          if (!$scope.conversations[user.id]) $scope.conversations[user.id] = {
            user: user,
            messages: [],
            unread:0
          }
        }

        $scope.changeConversation = function( user ){
          if (!$scope.conversations[user.id]) $scope.setConversation( user )
          $scope.currentConversation = $scope.conversations[user.id]
          $scope.currentConversation.unread = 0
        }

        $scope.deleteConversation = function( user ){
          if( $scope.conversations[user.id] ) delete $scope.conversations[user.id]
          if( $scope.currentConversation.user.id == user.id ){
            $scope.changeConversation( roomUser )
          }
        }

        $scope.length = function( obj ){
          return Object.keys(obj).length
        }
      },
      compile : function($ele){
        var config = JSON.parse($ele.attr('chat'))
        $ele.find('[window]').attr('window', config.mode.toString())

        return function($scope, $ele){
          //var reconnectTimeout
          //document.addEventListener("webkitvisibilitychange", function() {
          //  if( config.autoReconnect && !$scope.connected && !document.hidden ){
          //    //reconnect
          //    console.log("reconnecting du")
          //    reconnectTimeout = setTimeout(function(){
          //      $scope.$apply(function(){
          //        $scope.reconnect()
          //      })
          //    },2000)
          //  }else{
          //    if( reconnectTimeout ) clearTimeout(reconnectTimeout)
          //  }
          //}, false);
        }
      }
    }
  })
  .directive("autoScroll",function( $rootScope){
    return function( $scope, $ele, $attrs){
      $attrs['autoScroll'].split(',').forEach(function( event){
        $rootScope.$on( event,function(){
          $ele.animate({
            scrollTop : $ele[0].scrollHeight - $ele[0].clientHeight + 20
          },'fast')
        })
      })
    }
  })
  .directive("senderInput",function( config ){


    var allowedTypes = ['image/jpg','image/jpeg','image/png'],
      downloadDomain = "http://houzhenyu.qiniudn.com",
      uptokenAddr = "/qiniu/uptoken/eleven",
      uploadUrl = "http://up.qiniu.com",
      uploadId = 1,
      parseThisResult = _.partial(parseQiniuUploadRespond, downloadDomain)

    return function( $scope, $ele, $attrs ){

      $ele[0].addEventListener('keyup',function(e){
        if(e.keyCode==13){
          $scope.$apply(function(){
            $scope[$attrs['ngKeyup']]($ele[0].innerHTML)
          })
          $ele[0].innerHTML = ""
          $ele[0].standard = false
          e.preventDefault()
        }
      })


      $ele[0].addEventListener('drop', function(e) {
        e.stopPropagation();
        e.preventDefault();
        _.forEach( e.dataTransfer.files, function( file){
          receiveItem($ele[0],file)
        })
      }, false);
      $ele[0].addEventListener('dragenter', function(e) {
        e.stopPropagation();
        e.preventDefault();
      }, false);
      $ele[0].addEventListener('dragover', function(e) {
        e.stopPropagation();
        e.preventDefault();
      }, false);
    }


    function receiveItem( ele, file ){
      console.log( file )
      if ( isAllowedFile(file,allowedTypes)) {
        var thisUploadId = uploadId++
        readFromFile(file, _.partial(appendAsImg,ele, thisUploadId))
        $.get( config().chat.host + uptokenAddr).then(function(data){
          upload(file,{
            params:{ token : data.uptoken },
            url : uploadUrl,
            parseResponse: parseThisResult,
            onUploadedFile : _.partial(replaceImg, ele,thisUploadId )
          });
        })
        e.preventDefault()
      }else{
        alert("不支持该类型的文件:"+file.type)
      }
    }

    function readFromFile( file, cb ){
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function(){ cb( reader.result )}
    }

    function parseQiniuUploadRespond( downloadDomain, xhr ){
      return downloadDomain + "/" + JSON.parse(xhr.response).key
    }

    function isAllowedFile(file,allowedTypes) {
      return allowedTypes.indexOf(file.type) >= 0;
    }

    function appendAsImg( ele, uploadId, url ){
      var content = ele.innerHTML
      if( !ele.standard ){
        ele.standard = true
        content = "<span>"+content+"</span>"
      }
      ele.innerHTML = content + "<img "+ (uploadId&&"upload-id='"+uploadId+"'")+" src='"+url+"'>"
    }

    function replaceImg( ele, uploadId, url){
      $(ele).find("[upload-id="+uploadId+"]").attr("src",url).removeAttr( "upload-id")
      //console.log("上传成功",uploadId,url,$(ele).find("[upload-id="+uploadId+"]"))
    }

  })


function upload(file,options) {
  console.log("upload", file, options)
  var formData = new FormData(),
    xhr = new XMLHttpRequest(),
    extension = 'png';

  options = _.defaults(options||{},{
    url: 'upload_attachment.php',
    uploadMethod: 'POST',
    uploadFieldName: 'file',
    downloadFieldName: 'filename',
    params: {},
    headers: {},
    parseResponse : function(){},
    onUploadedFile: function() {},
    onErrorUploading : function(){}
  })

  // Attach the file. If coming from clipboard, add a default filename (only works in Chrome for now)
  // http://stackoverflow.com/questions/6664967/how-to-give-a-blob-uploaded-as-formdata-a-file-name
  if (file.name) {
    var fileNameMatches = file.name.match(/\.(.+)$/);
    if (fileNameMatches) {
      extension = fileNameMatches[1];
    }
  }else if( file.type ){
    extension = file.type.split("/").pop()
  }


  // Add any available extra parameters
  if (typeof options.params === "object") {
    for (var key in options.params) {
      if (options.params.hasOwnProperty(key)) {
        formData.append(key, options.params[key]);
      }
    }
  }

  formData.append(options.uploadFieldName, file, file.name || "image-" +Date.now() + "." + extension);

  xhr.open(options.uploadMethod, options.url);

  // Add any available extra headers
  if (typeof options.headers === "object") {
    for (var header in options.headers) {
      if (options.headers.hasOwnProperty(header)) {
        xhr.setRequestHeader(header, options.headers[header]);
      }
    }
  }


  xhr.onload = function() {
    // If HTTP status is OK or Created
    if (xhr.status === 200 || xhr.status === 201) {
      console.log( "load", xhr )
      var data = options.parseResponse(xhr)
      options.onUploadedFile(data);
    } else {
      options.onErrorUploading();
    }
  };
  xhr.send(formData);
};

