#!/bin/bash

NAME=${1:-wsk-chatbot-framework}/middleware
PARAMETERS=`echo -n $(cat parameters.json)`

zip -r action.zip *

wsk action list | grep ${NAME} > /dev/null && wsk action delete ${NAME} || true
wsk action update ${NAME} \
  --kind nodejs:6 action.zip \
  -a description 'The framework action which calls and handles middleware calls.' \
  -a parameters "$PARAMETERS"

rm action.zip