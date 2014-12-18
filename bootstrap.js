//load templates
var templateUrls = ['modules/index/index.html', 'modules/chat/chat.html', 'modules/mark/mark-scroll.html', 'modules/mark/mark-container.html']
var cssUrls = ['modules/index/index.css','modules/chat/chat.css','modules/mark/mark.css']

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

    var $root = $("<div></div>"),
      $shadowRoot = $($root[0].createShadowRoot())

    $("body").append($root)

    var imports = ""
    cssUrls.forEach(function( relativeUrl ){
      imports += "@import url(" + chrome.extension.getURL(relativeUrl) + ");\n"
    })
    $shadowRoot.append("<style>\n"+imports+"</style>")

    $shadowRoot.append($index)

  });


})


