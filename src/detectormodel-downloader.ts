// configure first !!!!
import {TensorNodeUtils} from './objectdetection/utils/tensor-node-utils';
const rootDir = 'file://' + __dirname + '/../';
TensorNodeUtils.initEnvironment(rootDir);

import * as Promise_serial from 'promise-serial';
import {AbstractObjectDetector} from './objectdetection/abstract-object-detector';
import {DetectorFactory} from './objectdetection/utils/detector-factory';
import {DetectorUtils} from './objectdetection/utils/detector-utils';
import * as minimist from 'minimist';

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

// configure detectors
let detectors: AbstractObjectDetector[] = [];
try {
    detectors = DetectorFactory.createDetectors(argv['detectors'], rootDir);
} catch (err) {
    console.error('ERROR - cant create detectors:', err);
}
if (detectors.length < 1) {
    console.error(DetectorFactory.getAvailableDetectorMessage(), argv);
    process.exit(-1);
}
myLog('STARTING - model-download for detectors: ' + DetectorUtils.getDetectorIds(detectors).join(','));

const detectorDownloads = [];
for (const detector of detectors) {
    detectorDownloads.push(function () {
        return DetectorUtils.downloadDetectorModelFiles(detector);
    })
}

Promise_serial(detectorDownloads, {parallelize: 1}).then(arrayOfResults => {
    const detectedObjects = [];
    for (let i = 0; i < arrayOfResults.length; i++) {
        for (let s = 0; s < arrayOfResults[i].length; s++) {
            detectedObjects.push(arrayOfResults[i][s]);
        }
    }
    console.log('DONE - downloaded models');
}).catch(reason => {
    console.error('ERROR - cant download models', reason)
});



