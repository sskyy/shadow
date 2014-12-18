angular.module('mark',[])
  .directive("markContainer", function(messenger, config){
  return {
    restrict : "EA",
    templateUrl : 'modules/mark/mark-container.html',
    controller : function( $scope,$http){
      $scope.host = config().mark.host
      $scope.marks = []
      $scope.markMode = false

      $scope.markInput = {x:null, y:null,visible:false}

      $scope.showMarkInput = function( x, y ){
        console.log( x, y)
        _.extend( $scope.markInput, {x:x,y:y, visible:true})
      }

      $scope.createMark = function( mark ){
        console.log( mark,"create")
        $http.post( $scope.host+"/mark", mark).success(function(savedMark){
          $scope.marks.push(savedMark)
          $scope.displayMarks.push(savedMark)
        })
      }

      $scope.displayMarks = []

      $scope.count = 0
      $scope.limit = 2
      $scope.view = 1
      $scope.terminal = false
      $scope.offset = 0

      $scope.updateDisplay = function( offset ){
        if( offset !== undefined && $scope.offset == offset ) return

        if( offset !== undefined ) $scope.offset = offset


        $scope.displayMarks = $scope.marks.slice( $scope.offset,$scope.offset+$scope.view)
      }

      $scope.getMarks = function(){
        $http({
          url : $scope.host+"/mark",
          params : {
            location :location.href.replace(/\?.*$/, ""),
            limit : $scope.limit,
            skip : $scope.count,
            sort : "id DESC"
          }
        }).then(function( res){
          $scope.marks = $scope.marks.concat(res.data)
          $scope.count += res.data.length
          if( res.data.length < $scope.limit ) $scope.terminal = true

          $scope.updateDisplay()
        })
      }
    },
    link : function( $scope, $ele, $attrs){
      var inputMode = false,
        markConfig = config().mark

      $scope.visible = markConfig.visible

      //custom style
      $ele.css({
        position:"absolute",
        background : "rgba(255,255,255,.3)",
        top : 0,
        left:0,
        width:0,
        height: 0,
        overflow:"visible",
        "z-index":99999
      })


      $("body").keydown(function(e){
        if( !$scope.visible ) return
        if(e.keyCode==markConfig.controlKeyCode && !inputMode){
            inputMode = true
          showInputMask($ele)
        }
      })

      $("body").keyup(function(e){
        if( !$scope.visible ) return
        if(e.keyCode==markConfig.controlKeyCode && inputMode){
          inputMode=false
          hideInputMask($ele)
        }
      })

      messenger.on("config.set",function( newConfig ){
        console.log("get new config", newConfig)
        $scope.$apply(function(){
          $scope.visible = newConfig.mark.visible
        })
      })

      function showInputMask( $ele){
        $ele.attr('mark-mode',true)
        $ele.css({
          height : document.body.scrollHeight + "px",
          width: document.body.scrollWidth + "px"
        })
      }

      function hideInputMask($ele){
        $ele.attr('mark-mode',false)
        $ele.css({
          height : 0,
          width: 0
        })
      }

      function setInputMask($ele, visible){
        if( visible ){
          showInputMask($ele)
        }else{
          hideInputMask($ele)
        }
      }


    }
  }
})
.directive("mark",function(){
    return {
      restrict : "EA",
      scope:{
        mark : "=mark"
      },
      link : function( $scope, $ele ){
        $ele.css({
          position:"absolute",
          left : document.body.scrollWidth/2  + $scope.mark.position.x ,
          top : $scope.mark.position.y
        }).text($scope.mark.content)
      }
    }
  })
.directive("markInput",function(){
    return {
      restrict : "EA",
      scope:{
        config : "=markInput"
      },
      template : '<input type="text">',
      link : function( $scope, $ele, $attrs){
        $ele.css({
          position : "absolute"
        })

        var $input = $($ele.find("input"))


        $scope.$watch('config.visible', function(visible){
          setupStyle($ele, $scope.config)
          if( visible) $input.focus()
        })


        $input.keyup(function(e){
          if(e.keyCode==13){
            $scope.$parent.$apply(function(parent){
              parent[$attrs['markCreate']]({
                location : location.href.replace(/\?.*$/, ""),
                position:{
                  x : $scope.config.x - document.body.scrollWidth/2,
                  y : $scope.config.y
                },
                content:$input.val()
              })

              $scope.config.visible = false
            })
          }
        })


        function setupStyle($ele,config){
          if( config.visible ){
            $ele.css({
              display:"block",
              position:"absolute",
              top : config.y,
              left : config.x
            })
          }else{
            $ele.css({"display":"none"})
          }
        }

      }
    }
  })
.directive('markScroll',function( $rootScope){
    return {
      restrict : "EA",
      scope : {
        view : '=',
        count : '=',
        terminal : '='
      },
      templateUrl : "modules/mark/mark-scroll.html",
      link : function( $scope, $ele, $attrs){
        var trackHeight = window.innerHeight
        $ele.css({
          position:"fixed",
          top : 0,
          right :   0,
          height : trackHeight
        })

        var loadingData = false

        $ele.find('.overview').height(trackHeight*$scope.count/$scope.view )
        $ele.tinyscrollbar()

        var scrollbarData = $ele.data("plugin_tinyscrollbar")
        $ele.bind("move", function(e){

          var threshold       = 0.9,
            positionCurrent = scrollbarData.contentPosition + scrollbarData.viewportSize,
            positionEnd     = scrollbarData.contentSize * threshold;

          if(!$scope.terminal && !loadingData && positionCurrent >= positionEnd){
            loadingData = true;
            $scope.$parent.$apply(function(parentScope){
              parentScope[$attrs['onLoad']]()
            })
          }

          $scope.$parent.$apply(function(parentScope){
            parentScope[$attrs['onMove']]( Math.round(scrollbarData.contentPosition/scrollbarData.viewportSize *$scope.view))
          })
        });

        $scope.$watch('count', function(){
          loadingData = false;
          $ele.find('.overview').height( trackHeight*$scope.count/$scope.view )
          scrollbarData.update("relative");
        })
      }
    }
  })