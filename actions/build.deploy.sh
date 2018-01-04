#!/bin/bash

# Configuration
PACKAGE=openwhisk-chatbot-framework
PACKAGE_GENERIC=${PACKAGE}-generic
PACKAGE_API=${PACKAGE}-api

# Create package if not existing
echo "Creating Packages '${PACKAGE_GENERIC}' && '${PACKAGE_API}'"
wsk package create ${PACKAGE_GENERIC} &> /dev/null || true
wsk package create ${PACKAGE_API}  &> /dev/null || true

for dir in `find . -maxdepth 1 -mindepth 1 -type d | grep -v _template`
do
    ACTION=`echo $dir | awk -F'/' '{ print $2 }'`;

    pushd ${dir} > /dev/null
      echo "Creating package for action '${ACTION}' ..."
      NAME="${PACKAGE_GENERIC}/${ACTION}"
      DESCRIPTION=`cat package.json | grep description | awk -F'"' '{ print $4 }'`
      zip -r action.zip * > /dev/null

      echo "Creating action '${NAME}' ..."
      wsk action list | grep ${NAME} > /dev/null && wsk action delete ${NAME} &> /dev/null || true
      wsk action update ${NAME} \
        --kind nodejs:6 action.zip \
        -a description "${DESCRIPTION}"

      rm action.zip
    popd > /dev/null
done

# Create package bindings
echo "Binding parameters to package '${PACKAGE}' ..."
wsk package delete ${PACKAGE} || true
wsk package bind ${PACKAGE_GENERIC} ${PACKAGE} -P package.parameters.json

for dir in `find . -maxdepth 1 -mindepth 1 -type d | grep -v _template`
do
    ACTION=`echo $dir | awk -F'/' '{ print $2 }'`;

    pushd ${dir} > /dev/null
      # Create web action if necessary
      cat package.json | grep "openwhisk-routes" > /dev/null && \
        echo "Creating api action for '${PACKAGE}/${ACTION}' ..." && \
        wsk action update ${PACKAGE_API}/${ACTION} \
        --sequence ${PACKAGE}/${ACTION} \
        --web true || true
    popd > /dev/null
done