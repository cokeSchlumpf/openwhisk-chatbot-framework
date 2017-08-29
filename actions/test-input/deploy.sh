#!/bin/bash

NAME=${1:-wsk-chatbot-framework}/test-input
PARAMETERS=`echo -n $(cat parameters.json)`

zip -r action.zip *

wsk action list | grep ${NAME} > /dev/null && wsk action delete ${NAME} || true
wsk action update ${NAME} \
  --kind nodejs:6 action.zip \
  -a description 'A test input connector.' \
  -a parameters "$PARAMETERS"

rm action.zip