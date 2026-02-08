const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");


module.exports = {
    entry: './src/scripts/index.js',
    mode: "development",
    devtool: "eval-source-map",
    devServer: {
        liveReload: false,
        static: {
            directory: path.resolve(__dirname, '../'),
        },
        historyApiFallback: {
            rewrites: [
                { from: /^\/online\//, to: '/index.html' }
            ]
        }
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
                        plugins: ['@babel/plugin-transform-class-properties']
                    }
                }
            },
            {
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.(gif|png|jpe?g|svg|xml|json|tsx|mp3)$/i,
                type: 'asset/resource'
            }
        ]
    },
    plugins: [
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
