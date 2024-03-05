import { nodeResolve } from "@rollup/plugin-node-resolve"

export default {
    input: "../tmp/ts/main.js",
    output: {
        file: "../tmp/rlp/bundle.js",
        format: "iife"
    },
    plugins: [ nodeResolve() ]
}