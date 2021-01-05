var loaded = {};
var exports = {};
var module = { exports: exports };

function require(uri) {
    if (loaded[uri] !== undefined) {
        return exports;
    }
    
    if (uri.indexOf("./") < 0) {
        uri = `js/${uri}.js`;
        console.log(`require('${uri}'); loaded: ${JSON.stringify(loaded)}`);

        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", uri, false);
        xmlHttp.send(null);
        eval(xmlHttp.responseText);
    }
    
    loaded[uri] = null;
    return exports;
}