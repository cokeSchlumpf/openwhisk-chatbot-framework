#!/bin/bash

# Configuration
PACKAGE=v1

# Create package if not existing
echo "Creating Package '${PACKAGE}' ..."
wsk package create ${PACKAGE} --shared yes &> /dev/null || true

for dir in `find . -maxdepth 1 -mindepth 1 -type d | grep -v _template`
do
    ACTION=`echo $dir | awk -F'/' '{ print $2 }'`;

    pushd ${dir} > /dev/null
      echo "Creating package for action '${ACTION}' ..."
      NAME="${PACKAGE}/${ACTION}"
      DESCRIPTION=`cat package.json | grep description | awk -F'"' '{ print $4 }'`
      zip -r action.zip * > /dev/null
      NEW_HASH=`md5sum action.zip`

      echo "Creating action '${NAME}' ..."
      wsk action list | grep ${NAME} > /dev/null && wsk action delete ${NAME} &> /dev/null || true
      wsk action update ${NAME} \
        --kind nodejs:6 action.zip \
        -a description "${DESCRIPTION}" \
        -a package-hash "${NEW_HASH}"

      rm action.zip
    popd > /dev/null
done