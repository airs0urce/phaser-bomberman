const { merge } = require("webpack-merge");
const path = require("path");
const fs = require("fs");
const base = require("./base");
const TerserPlugin = require("terser-webpack-plugin");

// Inline plugin to copy manifest.json into dist/
class CopyManifestPlugin {
    apply(compiler) {
        compiler.hooks.afterEmit.tapAsync('CopyManifestPlugin', (compilation, callback) => {
            const src = path.resolve(__dirname, '..', 'manifest.json');
            const dest = path.resolve(compiler.options.output.path || path.resolve(__dirname, '..', 'dist'), 'manifest.json');
            fs.copyFile(src, dest, callback);
        });
    }
}

module.exports = merge(base, {
    mode: "production",
    output: {
        filename: "bundle.min.js",
        publicPath: "/",
        clean: true
    },
    devtool: false,
    performance: {
        maxEntrypointSize: 900000,
        maxAssetSize: 900000
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    output: {
                        comments: false
                    }
                }
            })
        ]
    },
    plugins: [
        new CopyManifestPlugin()
    ]
});
