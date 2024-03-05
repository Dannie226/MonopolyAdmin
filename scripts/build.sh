#! /usr/bin/bash

mkdir ../tmp
mkdir ../tmp/ts

../node_modules/.bin/tsc

cp ../src/libs/*.js ../tmp/ts/libs/

# ./node_modules/.bin/tsc --module ES2022 --target common --include ./node_libs/SocketServerCommunicator.ts --outDir ./node_libs

mkdir ../tmp/rlp

../node_modules/.bin/rollup -c ../rollup.config.js
../node_modules/.bin/rollup ../node_libs/SocketServerCommunicator.tmp.js -o ../node_libs/SocketServerCommunicator.cjs --format commonjs

mkdir ../tmp/trs

# ../node_modules/.bin/terser ./tmp/rlp/bundle.js -c -m -o ./tmp/trs/bundle.min.js

cp ../tmp/rlp/bundle.js ../out/out.js

rm -r ../tmp