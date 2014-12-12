//load templates
var templateUrls = ['modules/index/index.html', 'modules/chat/chat.html', 'modules/mark/mark-scroll.html', 'modules/mark/mark-container.html']

$.when.apply($, templateUrls.map(function (url) {
  return $.get(chrome.extension.getURL(url))
})).then(function () {
  var templates = Array.prototype.slice.call(arguments)
  templates.forEach(function (templateDefer, i) {
    angular.module('index').run(function ($templateCache) {
      $templateCache.put(templateUrls[i], templateDefer[0])
    })
  })


  chrome.runtime.sendMessage({cmd: "config.get"}, function(config) {
    console.log('config -->',config)

    var $index = $('<div index=\''+JSON.stringify(config)+'\'></div>')
    angular.bootstrap($index, ['index'])

    $("body").append("<div id='shadow_world'></div>")
    $($("#shadow_world")[0].createShadowRoot()).append($index)

    console.log( config )
  });


})


