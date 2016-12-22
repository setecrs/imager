#!/bin/bash -x
cd "$(dirname "$0")"
if [ ! -e node_modules ]
then
  npm install
fi
(echo SIZE="$1" ; env) | npm run notify
