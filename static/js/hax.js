var exports = {};
var module = { exports: exports };

function require(uri) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", `js/${uri.replace("./", "")}.js`, false);
    xmlHttp.send(null);
    eval(xmlHttp.responseText);
    return module.default = module.exports;
}