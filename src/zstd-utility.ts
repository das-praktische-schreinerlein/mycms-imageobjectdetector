import {FileUtils} from './common/utils/file-utils';
import * as minimist from 'minimist';
import * as fs from 'fs';
import {compress, decompress} from '@mongodb-js/zstd';

const argv = minimist(process.argv.slice(2));

// disable debug-logging
const debug = argv['debug'] || false;
const myLog: Function = console.log;
if (!debug) {
    console.log = function() {};
}
if (!debug || debug === true || parseInt(debug, 10) < 1) {
    console.trace = function() {};
    console.debug = function() {};
}

// check mode
let mode = argv['mode'] || false;
if (mode === false || (mode !== 'compress' && mode !== 'decompress')) {
    console.error('parameter sourceFile to process required');
    process.exit(-1);
}

// check source
let sourceFile = argv['sourceFile'] || false;
if (sourceFile === false) {
    console.error('parameter sourceFile to process required');
    process.exit(-1);
}
sourceFile = FileUtils.normalizePathStrict(sourceFile);
if (!FileUtils.checkConcreteFile(sourceFile)) {
    console.error('parameter sourceFile must be a existing file (no symbolic link accepted)', sourceFile);
    process.exit(-1);
}

// check source
let destFile = argv['destFile'] || false;
if (destFile === false) {
    console.error('parameter destFile to process required');
    process.exit(-1);
}
destFile = FileUtils.normalizePathStrict(destFile);
if (!FileUtils.checkConcreteDirectory(FileUtils.getDirectoryFromFilePath(sourceFile))) {
    console.error('parameter destFile must be in a existing directory (no symbolic link accepted)', destFile);
    process.exit(-1);
}

const startdata = new Date();
if (mode === 'decompress') {
    myLog('STARTING - extract content of zstd-file: ' +
        ' sourceFile: ' + sourceFile +
        ' destFile: ' + destFile);

    const src = fs.readFileSync(sourceFile);
    const buffer = Buffer.from(src);
    decompress(buffer).then(decompressed => {
        FileUtils.writeConcreteFileSync(destFile, decompressed);
        myLog('DONE - wrote decompressed file', sourceFile, src.length, 'Bytes', destFile, decompressed.length, 'Bytes',
            new Date().getTime() - startdata.getTime(), 'ms');
        return Promise.resolve(true);
    }).catch(error => {
        console.warn('ERROR - cant read compressed:', destFile, error, src.length, 'Bytes', buffer.length, 'Bytes');
        return Promise.reject('cant read zstd-file');
    });
} else {
    myLog('STARTING - compress content of file: ' +
        ' sourceFile: ' + sourceFile +
        ' destFile: ' + destFile);

    const src = fs.readFileSync(sourceFile, {encoding: 'utf8'});
    const buffer = Buffer.from(src);
    compress(buffer).then(compressed => {
        FileUtils.writeConcreteFileSync(destFile, compressed);
        myLog('DONE - wrote compressed file', sourceFile, src.length, 'Bytes', destFile, compressed.length, 'Bytes',
            new Date().getTime() - startdata.getTime(), 'ms');
        return Promise.resolve(true);
    }).catch(error => {
        console.warn('ERROR - cant read decompressed:', destFile, error, src.length, 'Bytes', buffer.length, 'Bytes');
        return Promise.reject('cant read source');
    });
}

