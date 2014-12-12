(function(exportor){


  function Dispatcher(){
    this._observers = {}
  }

  Dispatcher.prototype.fire = function(e){
    var args = Array.prototype.slice.call( arguments, 1)
    if( this._observers[e] ){
      this._observers[e].forEach(function( handler ){
        handler.apply( null, args )
      })
    }
  }

  Dispatcher.prototype.on = function( e, handler ){
    this._observers[e] = this._observers[e] || []
    this._observers[e].push( handler )
  }

  exportor.Dispatcher = Dispatcher

})(this)



