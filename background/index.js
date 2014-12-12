var messenger = new Messenger()
var injector = new Injector()
var chat = new Chat( messenger, injector )


//1. handle browser click
chrome.browserAction.onClicked.addListener(function(tab) {
  console.log("begin to inject to tab",tab.id)
  chat.inject(tab.id, "force")
});


//2. handle tab creation or update or close
chrome.tabs.onUpdated.addListener(function(tabId, info, tab){
  if( !tabId || !/^http/.test(tab.url)) return console.log("not a web page")
  info.status=='complete' && chat.inject(tab.id, "reload")
})

chrome.tabs.onRemoved.addListener(function(tab){
  chat.remove(tab.id)
})

console.log("chat is ready")




