#!/bin/bash

# Configuration
PACKAGE=sample-bot
PACKAGE_API=${PACKAGE}-api
PACKAGE_WSK_CHATBOT_FRAMEWORK="/wsk-chatbot-framework_prod/v1"

echo "***** Creating package binding from ${PACKAGE} to ${PACKAGE_WSK_CHATBOT_FRAMEWORK} ..."
wsk package delete ${PACKAGE} || true
wsk package bind ${PACKAGE_WSK_CHATBOT_FRAMEWORK} ${PACKAGE} -P package.parameters.json

echo "***** Creating web-action ${PACKAGE_API}/core-input for ${PACKAGE}/core-input ..."
wsk action update ${PACKAGE_API}/core-input \
        --sequence ${PACKAGE}/core-input \
        --web true || true