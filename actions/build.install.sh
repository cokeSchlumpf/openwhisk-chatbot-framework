#!/bin/bash

for dir in `find . -maxdepth 1 -mindepth 1 -type d`
do
    pushd ${dir} > /dev/null
      echo "Installing dependencies for '${dir}' ..."
      npm install
      which ncu > /dev/null && ncu serverless-botpack-lib -u
    popd > /dev/null
done