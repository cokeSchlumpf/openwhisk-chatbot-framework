#!/bin/bash

# install and configure Openwhisk CLI
wget https://openwhisk.ng.bluemix.net/cli/go/download/linux/amd64/wsk
chmod 777 wsk
export PATH=$PATH:$(pwd)
wsk property set --apihost $OPENWHISK_APIHOST --auth $OPENWHISK_AUTHKEY

# deploy the framework
npm install
npm run deploy