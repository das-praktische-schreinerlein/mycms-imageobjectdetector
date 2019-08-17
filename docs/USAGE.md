# Usage

## run detector on directory
- run common detectors 
```bash
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10
```
- run common detectors with cache 
```bash
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --useDirectoryCache
```
- run common detectors with different modes (default is mode=node)
```bash
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=browser --parallelizeDetector 10
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=node --parallelizeDetector 10
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10
```
- run selected detectors 
```bash
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --detectors=tfjs_posenet,tfjs_mobilenet_v1
```
- run selected detectors with cache 
```bash
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --detectors=tfjs_posenet,tfjs_mobilenet_v1 --useDirectoryCache
```
- run selected detectors with cache and force cache-update
```bash
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --detectors=tfjs_posenet,tfjs_mobilenet_v1 --useDirectoryCache --forceUpdateDirectoryCache 
```
- run selected detectors with cache, but dont update non existing entries
```bash
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --detectors=tfjs_posenet,tfjs_mobilenet_v1 --useDirectoryCache --directoryCacheReadOnly
```
- run selected detectors and break on any error
```bash
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --detectors=tfjs_posenet,tfjs_mobilenet_v1 --breakOnError
```

## run detector as queued-service
- redis: install and configure redis for queue
- objectdetector: configure queue config/queue.json
```json
{
    "redisQueue": {
        "host": "localhost",
        "port": "6379",
        "pass": "blablub",
        "db": "",
        "ns": "rsmq",
        "requestQueue": "mycms-objectdetector-request",
        "responseQueue": "mycms-objectdetector-response",
        "errorQueue": "mycms-objectdetector-error"
    },
    "allowedBasePath": ["D:\\Bilder\\mediadb\\pics_full\\"]
}
```
- objectdetector: start it with same options as imagefile-detector
```bash
npm run run-all-queue-detector -- --useDirectoryCache --mode=gpu --parallelizeDetector 10 --debug 1
```
- mytourbook: install [mytourbook](https://github.com/das-praktische-schreinerlein/mytourbook)
- mytourbook: import files as seen on mytourbook
- mytourbook: export to queue on mytourbook
```bash
node dist\backend\serverAdmin.js --command objectDetectionManager --action sendQueueRequests --maxPerRun 2 --debug 1
node dist\backend\serverAdmin.js --command objectDetectionManager --action sendQueueRequests --detector tfjs_cocossd_mobilenet_v1,tfjs_cocossd_mobilenet_v2,tfjs_cocossd_lite_mobilenet_v2,tfjs_mobilenet_v1,faceapi,picasafile --maxPerRun 2 --debug 1
node dist\backend\serverAdmin.js --command objectDetectionManager --action sendQueueRequests --detector picasafile --maxPerRun 2 --debug 1
```
- mytourbook: import from queue on mytourbook
```bash
node dist\backend\serverAdmin.js --command objectDetectionManager --action receiveQueueResponses --debug 1
```
- show and change detected object on [mytourbook search](http://localhost:4301/mytbdev/de/sections/start/search/jederzeit/ueberall/alles/egal/ungefiltert/relevance/odimgobject/10/1) or [mytourbook dashboard](http://localhost:4301/mytbdev/de/)
