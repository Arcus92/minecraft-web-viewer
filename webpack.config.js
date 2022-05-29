const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path')

let mode = 'production';
if (process.env.NODE_ENV === 'dev') {
    mode = 'development';
}

module.exports = {
    mode,
    entry: {
        main: './src/index.ts'
    },

    devServer: {
        port: 9000,
        historyApiFallback: {
            index: './dist/index.html'
        },
        static: {
            serveIndex: true,
            directory: './dist/',
        }
    },
    performance: {
        maxAssetSize: 10000000000,
        maxEntrypointSize: 10000000000,
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    plugins: [
        new HtmlWebpackPlugin({
            hash: true,
            template: 'index.html'
        }),
        new CopyWebpackPlugin({
            patterns: [
                 { from: "./public/assets", to: "./assets" },
            ]
        })
    ],
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
        ]
    },
    watchOptions: {
        ignored: /node_modules/
    }
}