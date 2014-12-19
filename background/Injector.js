(function(exportor){

  function forEachSeries( arr, cb ){
    if( arr.length == 0 ) return cb&&cb()

    var current = arr.shift()
    current[0].apply( current[0], current.slice(1).concat( function(){
      forEachSeries( arr, cb )
    }))
  }

  function Injector(){
    this.files = {
      app : [
        'lib/jquery.min.js',
        'lib/jquery.tinyscrollbar.min.js',
        "lib/socket.io-1.2.1.js",
        "lib/inline-attach.js",
        "lib/angular.min.js",
        "lib/angular-sanitize.min.js",
        "lib/angular.inline-attach.js",
        "lib/lodash.compat.min.js",
        "modules/chat/chat.js",
        "modules/mark/mark.js",
        "modules/index/index.js",
        "bootstrap.js"
      ],
      scanner : [
        'lib/jquery.min.js',
        'modules/scanner/index.js'
      ]
    }
  }

  Injector.prototype.inject = function( type, tabId, cb ){
    console.log( "injecting", type, "to ", tabId)
    forEachSeries( this.files[type].map(function(file){
      return [chrome.tabs.executeScript,tabId, {file:file}]
    }), cb )
  }

  exportor.Injector = Injector

})(this)