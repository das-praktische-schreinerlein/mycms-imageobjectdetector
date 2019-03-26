export class TensorNodeUtils {
    public static initEnvironment(rootDir: string): void {
        this.initPolyFills();
        this.initPathes(rootDir);
        this.initLoaders();
    }

    public static initPolyFills(): void {
        // polyfill
        global['fetch'] = require('node-fetch');
        global['fetchFunc'] = require('node-fetch');
        global['XMLHttpRequest'] = require('xmlhttprequest').XMLHttpRequest;
    }

    public static initPathes(rootDir: string): void {
        // set global baseurl
        global['POSENET_BASE_URL'] = rootDir + 'assets/models/posenet/';
    }

    public static initLoaders(): void {
        const minimist = require('minimist');
        const argv = minimist(process.argv.slice(2));
        global['TFJS_LOADER'] = function () {
            if (!argv['mode'] || argv['mode'] === 'node') {
                try {
                    console.log('using tfjs-node');
                    return require('@tensorflow/tfjs-node');
                } catch (err) {
                    console.error('cant load tfjs-node, using tfjs', err);
                    return require('@tensorflow/tfjs');
                }
            }
            if (!argv['mode'] || argv['mode'] === 'gpu') {
                try {
                    console.log('using tfjs-node-gpu');
                    return require('@tensorflow/tfjs-node-gpu');
                } catch (err) {
                    console.error('cant load tfjs-node-gpu, using tfjs-node', err);
                    return require('@tensorflow/tfjs-node');
                }
            }

            const tf = require('@tensorflow/tfjs');
            const fileSystem = require('@tensorflow/tfjs-node/dist/io/file_system');
            if (tf.io.getLoadHandlers('file://').length === 0) {
                tf.io.registerLoadRouter(fileSystem.nodeFileSystemRouter);
            }
            if (tf.io.getSaveHandlers('file://').length === 0) {
                tf.io.registerSaveRouter(fileSystem.nodeFileSystemRouter);
            }

            return tf;
        };

    }
}