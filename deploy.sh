#!/bin/bash

kill `pidof node` || true

while ps -A | grep -E '(npm|node)'
do
    echo "Waiting for node to exit"
    sleep 1
done

npm run watch-server >> server.log 2>&1 &
disown
