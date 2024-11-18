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

## face-matcher on cache-files with humanapi-detector-results
- 
```bash
npm run run-face-matcher -- --faceDbFile f:/tmp/image-src/facedb.json --matchDbFile f:/tmp/image-src/matchdb.json --cacheFiles f:/tmp/image-src/bla/.mycmsod-cache.json --minSimilarity 0.6 --minFacePrecision 0.5 --debug
```


## services
- decompress zstd-file
```bash
npm run run-zstd-utility -- --mode decompress --sourceFile f:/tmp/image-src/bla/.mycmsod-cache.json.zstd --destFile f:/tmp/image-src/bla/cache.json --debug 1
```
- compress a zstd-file
```bash
npm run run-zstd-utility -- --mode compress --sourceFile f:/tmp/image-src/bla/cache.json --destFile f:/tmp/image-src/bla/cache.json.zstd --debug 1
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

## HINTS
- HINT for picasa-detector: after running picasa create empty picasa.ini-file before running picasa-detector
```bash
sbin/create-picasa_ini-for-image-dirs.sh /cygdrive/d/Bilder/mediadb/pics_full/
```

## show redis-queue
- get all keys
```
127.0.0.1:6379> keys *
```
- get content of queue
```
127.0.0.1:6379> hkeys rsmq-test:mycms-objectdetector-request:Q
1) "vt"
2) "delay"
3) "created"
4) "fjiza2ykjb71OfKMfmk7QweY5Cfj1rDt"
5) "modified"
6) "totalsent"
7) "totalrecv"
8) "fjiza2z0rfXL0O89ItPQOr5WCigoTueq"
9) "maxsize"

127.0.0.1:6379> hget rsmq-test:mycms-objectdetector-request:Q fjiza2z0rfXL0O89ItPQOr5WCigoTueq
"{\"detectors\":[\"tfjs_cocossd_mobilenet_v1\",\"tfjs_cocossd_mobilenet_v2\",\"tfjs_cocossd_lite_mobilenet_v2\",\"tfjs_mobilenet_v1\",\"faceapi\",\"picasafile\"],\"fileName\":\"D:/Bilder/mediadb/pics_full/D__Bilder_digifotos_import-2010-02_20100320-gross-schauen/HPIM2041.JPG\",\"refId\":\"IMAGE_67472\",\"state\":\"OPEN\"}"

127.0.0.1:6379> hgetall rsmq-test:mycms-objectdetector-request:Q
 1) "vt"
 2) "30"
 3) "delay"
 4) "0"
 5) "created"
 6) "1578487446"
 7) "fjiza2ykjb71OfKMfmk7QweY5Cfj1rDt"
 8) "{\"detectors\":[\"tfjs_cocossd_mobilenet_v1\",\"tfjs_cocossd_mobilenet_v2\",\"tfjs_cocossd_lite_mobilenet_v2\",\"tfjs_mobilenet_v1\",\"faceapi\",\"picasafile\"],\"fileName\":\"D:/Bilder/mediadb/pics_full/D__Bilder_digifotos_import-2010-02_20100320-gross-schauen/HPIM2040.JPG\",\"refId\":\"IMAGE_67471\",\"state\":\"OPEN\"}"
 9) "modified"
10) "1578487446"
11) "totalsent"
12) "4"
13) "totalrecv"
14) "2"
15) "fjiza2z0rfXL0O89ItPQOr5WCigoTueq"
16) "{\"detectors\":[\"tfjs_cocossd_mobilenet_v1\",\"tfjs_cocossd_mobilenet_v2\",\"tfjs_cocossd_lite_mobilenet_v2\",\"tfjs_mobilenet_v1\",\"faceapi\",\"picasafile\"],\"fileName\":\"D:/Bilder/mediadb/pics_full/D__Bilder_digifotos_import-2010-02_20100320-gross-schauen/HPIM2041.JPG\",\"refId\":\"IMAGE_67472\",\"state\":\"OPEN\"}"
17) "maxsize"
18) "65536"
```
