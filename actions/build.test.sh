#!/bin/bash

set -e

for dir in `find . -maxdepth 1 -mindepth 1 -type d | grep -v _template`
do
    pushd ${dir} > /dev/null
      npm test
    popd > /dev/null
done

# curl -v https://openwhisk.ng.bluemix.net/api/v1/web/wellnr_dev/wsk-chatbot-framework-api/input?hello=you