// polyfill
global['fetch'] = require('node-fetch');
global['fetchFunc'] = require('node-fetch');
global['XMLHttpRequest'] = require('xmlhttprequest').XMLHttpRequest;
// set global baseurl
const rootDir = 'file://' + __dirname + '/../';
global['POSENET_BASE_URL'] = rootDir + 'assets/models/posenet/';

import {LogUtils} from '@dps/mycms-commons/dist/commons/utils/log.utils';
import {DetectorFactory} from './objectdetection/utils/detector-factory';
import {AbstractObjectDetector} from './objectdetection/abstract-object-detector';
import {FileUtils} from './common/utils/file-utils';
import {DetectorUtils} from './objectdetection/utils/detector-utils';
import {DetectorResultDirectoryCacheService} from './objectdetection/utils/detectorresult-directorycache';
import {AbstractDetectorResultCacheService} from '@dps/mycms-commons/dist/commons/services/objectdetectionresult-cache';
import * as minimist from 'minimist';

const argv = minimist(process.argv.slice(2));
if (!argv['mode'] || argv['mode'] === 'node') {
    try {
        require('@tensorflow/tfjs-node') ? console.log('using tfjs-node') : undefined;
    } catch (err) {
        console.error('cant load tfjs-node', err);
    }
}
if (!argv['mode'] || argv['mode'] === 'gpu') {
    try {
        require('@tensorflow/tfjs-node-gpu') ? console.log('using tfjs-node-gpu') : undefined;
    } catch (err) {
        console.error('cant load tfjs-node-gpu', err);
    }
}

// disable debug-logging
const debug = argv['debug'] || false;
const myLog: Function = console.log;
if (!debug) {
    console.trace = function() {};
    console.debug = function() {};
    console.log = function() {};
}

// check source
const sourceDir = argv['sourceDir'] || false;
const destDir = argv['destDir'] || sourceDir;
if (sourceDir === false) {
    console.error('parameter sourceDir to process required');
    process.exit(-1);
}

// check cache
const useDirectoryCache = argv['useDirectoryCache'] ? true : false;
const breakOnError = argv['breakOnError'] ? true : false;
const directoryCacheReadOnly = argv['directoryCacheReadOnly'] ? true : false;
const forceUpdateDirectoryCache = argv['forceUpdateDirectoryCache'] ? true : false;
const detectorCacheService: AbstractDetectorResultCacheService = useDirectoryCache ? new DetectorResultDirectoryCacheService(directoryCacheReadOnly, forceUpdateDirectoryCache) : undefined;

// configure detectors
let detectors: AbstractObjectDetector[] = [];
try {
    detectors = DetectorFactory.createDetectors(argv['detectors'], rootDir);
} catch (err) {
    console.error('ERROR - cant create detectors: ', err);
}
if (detectors.length < 1) {
    console.error(DetectorFactory.getAvailableDetectorMessage(), argv);
    process.exit(-1);
}
myLog('STARTING - detection with detectors: ' + DetectorUtils.getDetectorIds(detectors).join(',') +
    ' useDirectoryCache: ' + useDirectoryCache +
    ' cacheServiceReadOnly: ' + directoryCacheReadOnly +
    ' forceUpdateDirectoryCache: ' + forceUpdateDirectoryCache +
    ' breakOnError: ' + breakOnError);

DetectorUtils.initDetectors(detectors).then(value => {
    const mediaTypes = {
        'jpg': 'IMAGE',
        'JPG': 'IMAGE'
    };
    FileUtils.doActionOnFilesFromMediaDir(sourceDir, destDir, '.tmp', mediaTypes,
        function (srcPath, destPath, processorResolve, processorReject, index, count) {
            console.log('RUNNING - detectors on image ' + index + '/' + count + ': ' + LogUtils.sanitizeLogMsg(srcPath));
            const start = new Date();
            DetectorUtils.detectFromImageUrl(detectors, srcPath, detectorCacheService, true).then(detectedObjects => {
                if (detectedObjects) {
                    for (let i = 0; i < detectedObjects.length; i++) {
                        console.log('OK found: ' + LogUtils.sanitizeLogMsg(srcPath) +
                            ' detector:' + detectedObjects[i].detector +
                            ' class: ' + LogUtils.sanitizeLogMsg(detectedObjects[i].keySuggestion) +
                            ' score:' + detectedObjects[i].precision +
                            ' x/y/w/h:[', [detectedObjects[i].objX, detectedObjects[i].objY, detectedObjects[i].objWidth,
                                           detectedObjects[i].objHeight].join(','), ']' +
                            ' dim:[', [detectedObjects[i].imgWidth, detectedObjects[i].imgHeight].join(','), ']');
                    }
                }

                console.debug('DONE - detectors on image ' + index + '/' + count + ' in ' + (new Date().getTime() - start.getTime()) + 'ms - ' + LogUtils.sanitizeLogMsg(srcPath));
                return processorResolve('OK');
            }).catch(reason => {
                console.error('ERROR -  detecting results:' + LogUtils.sanitizeLogMsg(srcPath), reason);
                return breakOnError ? processorReject(reason) : processorResolve(undefined);
            });
        }).then(value1 => {
        myLog('DONE - detection');
    }).catch(reason => {
        console.error('ERROR -  detecting results:', reason);
    });
}).catch(reason => {
    console.error('ERROR - initializing detectors:', reason);
});