// polyfill
global['fetch'] = require('node-fetch');
global['fetchFunc'] = require('node-fetch');
global['XMLHttpRequest'] = require('xmlhttprequest').XMLHttpRequest;
// set global baseurl
const rootDir = 'file://' + __dirname + '/../';
global['POSENET_BASE_URL'] = rootDir + 'assets/models/posenet/';

require('@tensorflow/tfjs-node') ? console.log('require tfjs-node') : undefined;

import {BaseObjectDetectionImageObjectRecordType} from "@dps/mycms-commons/dist/search-commons/model/records/baseobjectdetectionimageobject-record";
import {LogUtils} from "@dps/mycms-commons/dist/commons/utils/log.utils";
import {DetectorFactory} from './objectdetection/utils/detector-factory';
import {AbstractObjectDetector} from './objectdetection/abstract-object-detector';
import {DetectorUtils} from './objectdetection/utils/detector-utils';
import {AbstractDetectorResultCacheService} from './objectdetection/utils/detectorresult-cache';
import {DetectorResultDirectoryCacheService} from './objectdetection/utils/detectorresult-directorycache';
import * as minimist from 'minimist';
import * as RedisSMQ from 'rsmq';
import * as RSMQrsmqWorker from 'rsmq-worker';

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

const requestQueueName = 'mycms-objectdetector-request';
const responseQueueName = 'mycms-objectdetector-response';
const rsmqOptions = {host: '127.0.0.1', port: 6379, ns: 'rsmq'};
const rsmq = new RedisSMQ( rsmqOptions );
const rsmqWorker = new RSMQrsmqWorker(requestQueueName, rsmqOptions);

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

    return DetectorUtils.initDetectors(detectors);
}).then(value => {
    rsmqWorker.on( 'message', function(msg, next, id){
        // process your message
        console.log('Message id : ' + LogUtils.sanitizeLogMsg(id));
        console.log(msg);

        let request: BaseObjectDetectionImageObjectRecordType;
        try {
            request = JSON.parse(msg.message);
        } catch (error) {
            console.warn('error while processing message', LogUtils.sanitizeLogMsg(msg))
        }

        const srcPath = request.fileName;
        // TODO get detector from request
        const imageDetectors: AbstractObjectDetector[] = [];

        console.log('RUNNING - detector on image: ' + LogUtils.sanitizeLogMsg(srcPath), request.detector);
        DetectorUtils.detectFromImageUrl(imageDetectors, srcPath, detectorCacheService, true).then(detectedObjects => {
            if (detectedObjects) {
                // map responsedata with requestdata
                for (let i = 0; i < detectedObjects.length; i++) {
                    detectedObjects[i].fileName = request.fileName;
                    detectedObjects[i].id = request.id;
                }

                rsmq.sendMessage({
                    delay: 1000,
                    message: JSON.stringify(detectedObjects),
                    qname: responseQueueName,
                }, err => {
                    if (err) {
                        console.error('ERROR while sending response', err, msg.id);
                    }
                });
            } else {
                console.warn('got no result for: ' + LogUtils.sanitizeLogMsg(srcPath));
            }

            rsmqWorker.del(msg.id);
            next();
        }).catch(reason => {
            console.error('ERROR -  detecting results:' + LogUtils.sanitizeLogMsg(srcPath), reason);
            next();
        });
    });
    rsmqWorker.on('error', function(err, msg){
        console.error('ERROR while reading request', err, msg.id);
    });
    rsmqWorker.on('exceeded', function(msg){
        console.warn('EXCEEDED request', msg.id);
    });
    rsmqWorker.on('timeout', function(msg){
        console.warn('TIMEOUT request', msg.id, msg.rc);
    });

    myLog('start worker');
    rsmqWorker.start();
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

