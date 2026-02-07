const crypto = require("crypto");
const origCreateHash = crypto.createHash;
crypto.createHash = (alg, opts) =>
    origCreateHash(alg === "md4" ? "sha256" : alg, opts);

const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const {
    CleanWebpackPlugin
} = require("clean-webpack-plugin");


module.exports = {
    entry: './src/scripts/index.js',
    mode: "development",
    devtool: "eval-source-map",
    devServer: {
        liveReload: false
    },
    resolve: {
        extensions: ['.js']
    },
    module: {
        rules: [{
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        plugins: ['@babel/plugin-proposal-class-properties']
                    }
                }
            },
            {
                test: [/\.vert$/, /\.frag$/],
                use: "raw-loader"
            },
            {
                test: /\.(gif|png|jpe?g|svg|xml|json|tsx|mp3)$/i,
                use: "file-loader"
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin({
            root: path.resolve(__dirname, "../")
        }),
        new webpack.DefinePlugin({
            CANVAS_RENDERER: JSON.stringify(true),
            WEBGL_RENDERER: JSON.stringify(true)
        }),
        new HtmlWebpackPlugin({
            template: "./index.html"
        })
    ],
    target: 'web'
};





