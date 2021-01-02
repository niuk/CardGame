var exports = {};
var module = { exports: exports, default: exports };

function require(uri) {
    uri = `js/${uri.replace("./", "")}.js`;
    console.log(`require('${uri}')`)
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", uri, false);
    xmlHttp.send(null);
    window.eval(xmlHttp.responseText);
    return module.exports;
}