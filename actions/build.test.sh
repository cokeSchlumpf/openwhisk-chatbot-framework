#!/bin/bash

set -e

for dir in `find . -maxdepth 1 -mindepth 1 -type d`
do
    pushd ${dir} > /dev/null
      npm test
    popd > /dev/null
done