#!/bin/bash

for dir in `find . -maxdepth 1 -mindepth 1 -type d | grep -v _template`
do
    pushd ${dir} > /dev/null
      echo "Installing dependencies for '${dir}' ..."
      npm install --only=production
    popd > /dev/null
done