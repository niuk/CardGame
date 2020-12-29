var exports = {};

function require(uri) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", `js/${uri.replace("./", "")}.js`, false);
    xmlHttp.send(null);
    eval(xmlHttp.responseText);
    return exports;
}