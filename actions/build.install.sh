#!/bin/bash

for dir in `find . -maxdepth 1 -mindepth 1 -type d`
do
    pushd ${dir} > /dev/null
      echo "Installing dependencies for '${dir}' ..."
      which ncu > /dev/null && ncu -a serverless-botpack-lib
      npm install
    popd > /dev/null
done