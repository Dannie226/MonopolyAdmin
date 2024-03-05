mkdir ../tmp
mkdir ../tmp/ts

../node_modules/.bin/tsc

cp ../src/libs/*.js ../tmp/ts/libs/

mkdir ../tmp/rlp

../node_modules/.bin/rollup -c ../rollup.config.js

cp ../tmp/rlp/bundle.js ../out/out.js

rm -r ../tmp
