#!/bin/bash

for dir in `find . -maxdepth 1 -mindepth 1 -type d | grep -v _template`
do
    pushd ${dir} > /dev/null
      echo "Cleaning '${dir}' ..."
      rm -rf node_modules/
    popd > /dev/null
done