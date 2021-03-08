document.addEventListener('deviceready', onDeviceReady, false);

async function onDeviceReady() {
    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

    screen.orientation.lock('landscape');

    console.log('A');
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        console.log(request.readyState);
        if (request.readyState === 4) {
            console.log(request.status);
            console.log(request.responseText);
        }
    };

    console.log('B');
    request.open('GET', 'https://haruspex.io/client.js', true);
    console.log('C');
    request.send('');
    console.log('D');
}
