#!/bin/bash

for dir in `find . -maxdepth 1 -mindepth 1 -type d | grep -v _template`
do
    pushd ${dir} > /dev/null
      echo "Installing dependencies for '${dir}' ..."
      which ncu > /dev/null && ncu -a serverless-botpack-lib
      npm install
      # npm uninstall --save serverless-botpack-lib
      # npm install --save serverless-botpack-lib
    popd > /dev/null
done