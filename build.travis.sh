#!/bin/bash

cd ./actions
cp package.parameters.template.json package.parameters.json
sed -i 's/${CLOUDANT_URL}/'$CLOUDANT_URL'/g' package.parameters.json
sed -i 's/${CONVERSATION_USERNAME}/'$CONVERSATION_USERNAME'/g' package.parameters.json
sed -i 's/${CONVERSATION_PASSWORD}/'$CONVERSATION_PASSWORD'/g' package.parameters.json
sed -i 's/${CONVERSATION_WORKSPACEID}/'$CONVERSATION_WORKSPACEID'/g' package.parameters.json

# install and configure Openwhisk CLI
wget https://openwhisk.ng.bluemix.net/cli/go/download/linux/amd64/wsk
chmod 777 wsk
export PATH=$PATH:$(pwd)
wsk property set --apihost $OPENWHISK_APIHOST --auth $OPENWHISK_AUTHKEY

# deploy service
./build.deploy.sh