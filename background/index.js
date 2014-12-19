var messenger = new Messenger()
var injector = new Injector()
var chat = new Chat( messenger, injector )


//1. handle browser click
chrome.browserAction.onClicked.addListener(function(tab) {
  console.log("begin to inject to tab",tab.id)
  chat.inject("app",tab.id, "force")
});


chrome.tabs.onActivated.addListener(function( tab ){
  console.log("setting active tab", tab)
  chat.currentTab = tab.id
})

chrome.tabs.onUpdated.addListener(function( tabId, info, tab ){
  if( !tabId || !/^http/.test(tab.url) || info.status !=='complete') return console.log("not a web page, or not complete")

  console.log("update tab",tabId, info,chat.config)
  if( chat.insertedTabs[tabId] ){
    chat.inject("app", tab.id, "reload")
  }else if( chat.config.auto ){
    chat.inject("app", tab.id )
  }else if( chat.config.scanner ){
    console.log("injecting scanner")
    chat.inject("scanner", tab.id)
  }

})

chrome.tabs.onRemoved.addListener(function(tab){
  chat.remove(tab.id)
})

chrome.runtime.onMessage.addListener( function(request, sender, respond) {
  if( request == "injectApp" ){
    console.log("get request to inject app", sender.tab)
    chat.inject("app", sender.tab.id)
  }
})

console.log("chat is ready")




