// set global baseurl
const rootDir = 'file://' + __dirname + '/../';
global['POSENET_BASE_URL'] = rootDir + 'assets/models/posenet/';

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
    console.trace = function() {};
    console.debug = function() {};
    console.log = function() {};
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



