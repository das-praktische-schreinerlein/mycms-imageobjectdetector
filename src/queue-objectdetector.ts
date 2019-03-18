// polyfill
global['fetch'] = require('node-fetch');
global['fetchFunc'] = require('node-fetch');
global['XMLHttpRequest'] = require('xmlhttprequest').XMLHttpRequest;
// set global baseurl
const rootDir = 'file://' + __dirname + '/../';
global['POSENET_BASE_URL'] = rootDir + 'assets/models/posenet/';

require('@tensorflow/tfjs-node') ? console.log('require tfjs-node') : undefined;

import {
    ObjectDetectionRequestType,
    ObjectDetectionResponseType,
    ObjectDetectionState
} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import {AbstractDetectorResultCacheService} from '@dps/mycms-commons/dist/commons/services/objectdetectionresult-cache';
import {LogUtils} from '@dps/mycms-commons/dist/commons/utils/log.utils';
import {DetectorFactory} from './objectdetection/utils/detector-factory';
import {AbstractObjectDetector} from './objectdetection/abstract-object-detector';
import {DetectorUtils} from './objectdetection/utils/detector-utils';
import {DetectorResultDirectoryCacheService} from './objectdetection/utils/detectorresult-directorycache';
import * as minimist from 'minimist';
import * as RedisSMQ from 'rsmq';
import * as RSMQWorker from 'rsmq-worker';

const argv = minimist(process.argv.slice(2));

// disable debug-logging
const debug = argv['debug'] || false;
const myLog: Function = console.log;
if (!debug) {
    console.trace = function() {};
    console.debug = function() {};
    console.log = function() {};
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
    console.error('ERROR - cant create detectors: ', LogUtils.sanitizeLogMsg(err));
}
if (detectors.length < 1) {
    console.error(DetectorFactory.getAvailableDetectorMessage(), LogUtils.sanitizeLogMsg(argv));
    process.exit(-1);
}
myLog('STARTING - queue detection with detectors: ' + DetectorUtils.getDetectorIds(detectors).join(',') +
    ' useDirectoryCache: ' + useDirectoryCache +
    ' cacheServiceReadOnly: ' + directoryCacheReadOnly +
    ' forceUpdateDirectoryCache: ' + forceUpdateDirectoryCache +
    ' breakOnError: ' + breakOnError);
const detectorMap = DetectorFactory.getDetectorMap(detectors);

const requestQueueName = 'mycms-objectdetector-request';
const errorQueueName = 'mycms-objectdetector-error';
const responseQueueName = 'mycms-objectdetector-response';
const rsmqOptions = {host: '127.0.0.1', port: 6379, ns: 'rsmq'};
const rsmq = new RedisSMQ( rsmqOptions );
const requestWorker = new RSMQWorker(requestQueueName, rsmqOptions);
const errorWorker = new RSMQWorker(errorQueueName, rsmqOptions);
const responseWorker = new RSMQWorker(responseQueueName, rsmqOptions);

let existingQueues = [];
myLog('check queues');
const server = rsmq.listQueuesAsync().then(queues => {
    existingQueues = queues;
    if (existingQueues.indexOf(requestQueueName) >= 0) {
        return new Promise<number>(resolve => {
            return resolve(0);
        });
    }

    myLog('create queue:' + requestQueueName);
    return rsmq.createQueueAsync({qname: requestQueueName});
}).then(value => {
    if (value === 1) {
        myLog('queue created:' + requestQueueName);
    } else if (value === 0) {
        myLog('queue exists:' + requestQueueName);
    }

    if (existingQueues.indexOf(responseQueueName) >= 0) {
        return new Promise<number>(resolve => {
            return resolve(0);
        });
    }

    myLog('create queue:' + responseQueueName);
    return rsmq.createQueueAsync({qname: responseQueueName});
}).then(value => {
    if (value === 1) {
        myLog('queue created:' + responseQueueName);
    } else if (value === 0) {
        myLog('queue exists:' + responseQueueName);
    }

    if (existingQueues.indexOf(errorQueueName) >= 0) {
        return new Promise<number>(resolve => {
            return resolve(0);
        });
    }

    return rsmq.createQueueAsync({qname: errorQueueName});
}).then(value => {
    if (value === 1) {
        myLog('queue created:' + errorQueueName);
    } else if (value === 0) {
        myLog('queue exists:' + errorQueueName);
    }

    return DetectorUtils.initDetectors(detectors);
}).then(value => {
    requestWorker.on( 'message', function(msg, next, id){
        console.debug('RUNNING - processing message:', id, msg);

        let request: ObjectDetectionRequestType;
        try {
            request = JSON.parse(msg);
        } catch (error) {
            console.warn('ERROR - error while parsing message', msg, error);
            return next(new Error(error));
        }

        const srcPath = request.fileName;
        let imageDetectors: AbstractObjectDetector[] = [];
        for (const detectorName of request.detectors) {
            if (detectorMap[detectorName]) {
                imageDetectors.push(detectorMap[detectorName]);
            } else {
                console.warn('ERROR - unknown detector:', detectorName, msg);
                return next(new Error('unknown detector:' + detectorName));
            }
        }

        console.debug('RUNNING - detector on image: ', srcPath, request.detectors);
        DetectorUtils.detectFromImageUrl(imageDetectors, srcPath, detectorCacheService, true).then(detectedObjects => {
            if (detectedObjects) {
                // map responsedata with requestdata
                for (let i = 0; i < detectedObjects.length; i++) {
                    detectedObjects[i].fileName = request.fileName;
                    detectedObjects[i].state = ObjectDetectionState.RUNNING_SUGGESTED;
                }

                let response: ObjectDetectionResponseType = {
                    request: request,
                    results: detectedObjects
                };

                responseWorker.send(JSON.stringify(response), err => {
                    imageDetectors = DetectorUtils.disposeObj(imageDetectors);
                    detectedObjects = DetectorUtils.disposeObj(detectedObjects);
                    request = DetectorUtils.disposeObj(request);
                    response = DetectorUtils.disposeObj(response);
                    if (err) {
                        console.error('ERROR - while sending response', err, msg);
                        msg = DetectorUtils.disposeObj(msg);
                        return next(new Error(err));
                    }

                    console.debug('DONE - send response for message', id);
                    requestWorker.del(id);
                });
            } else {
                imageDetectors = DetectorUtils.disposeObj(imageDetectors);
                detectedObjects = DetectorUtils.disposeObj(detectedObjects);
                request = DetectorUtils.disposeObj(request);
                msg = DetectorUtils.disposeObj(msg);
                console.warn('WARNING - got no result for', srcPath);
            }

            return next();
        }).catch(reason => {
            imageDetectors = DetectorUtils.disposeObj(imageDetectors);
            request = DetectorUtils.disposeObj(request);
            msg = DetectorUtils.disposeObj(msg);
            console.error('ERROR -  detecting results:' + LogUtils.sanitizeLogMsg(srcPath), reason);
            next(new Error(reason));
        });
    });
    requestWorker.on('error', function(err, msg){
        console.error('ERROR - request', err, msg.id);
        errorWorker.send(msg.message, err => {
            if (err) {
                console.error('ERROR - while sending error', err, msg.id);
                msg= DetectorUtils.disposeObj(msg);
                return;
            }

            const res =  requestWorker.del(msg.id);
            msg= DetectorUtils.disposeObj(msg);
            return res;
        });
    });
    requestWorker.on('exceeded', function(msg){
        console.warn('EXCEEDED - request', msg.id);
    });
    requestWorker.on('timeout', function(msg){
        console.warn('TIMEOUT - request', msg.id, msg.rc);
    });

    myLog('start worker');
    requestWorker.start();
});

try {
    server.catch(reason => {
        console.error('something went wrong', reason);
        process.exit(-1);
    });
} catch(reason) {
    console.error('server stopped with exception', reason);
    process.exit(-1);
}

