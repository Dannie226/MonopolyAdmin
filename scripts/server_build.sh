mkdir -p ../tmp/ts

../node_modules/.bin/tsc ../src/SocketCommunicator.ts --outDir ../tmp/ts --module ES2022 --target ES2022 --moduleResolution node --alwaysStrict true

../node_modules/.bin/rollup ../node_libs/SocketServerCommunicator.tmp.js -o ../node_libs/SocketServerCommunicator.cjs --format commonjs

rm -r ../tmp