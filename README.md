# MyCMS-ObjectDetection

MyCMS is a library for developing CMS-applications with ObjectDetection.
It's the software-stack behind the new portal-version [www.michas-ausflugstipps.de](https://www.michas-ausflugstipps.de/).

For more information take a look at documentation:
- [changelog](docs/CHANGELOG.md) 
- [credits for used libraries](docs/CREDITS.md)
- [installation](docs/INSTALL.md)
- [usage](docs/USAGE.md)

## Description

MyCMS-ObjectDetection is a redis-queue based server. Requests will be processed by objectDetection-adapters as tensorflow-objectdetection-models and picasa and result will be written to response-queue.
For performance on requested file-paths a cache-file will be used. Optional for gpu-support is available.  

- a request
```
{
    "detectors": [
        "tfjs_cocossd_mobilenet_v1",
        "tfjs_cocossd_mobilenet_v2",
        "tfjs_cocossd_lite_mobilenet_v2",
        "tfjs_mobilenet_v1",
        "faceapi",
        "picasafile"
    ],
    "fileName": "F:/playground/mytb-test/mytbmediabase//pics_full/import-XXXX_20190717/20190714_224039.jpg",
    "refId": "IMAGE_67472",
    "state": "OPEN"
} 
```
- a response
```
{
    "request": {
        "detectors": [
            "tfjs_cocossd_mobilenet_v1",
            "tfjs_cocossd_mobilenet_v2",
            "tfjs_cocossd_lite_mobilenet_v2",
            "tfjs_mobilenet_v1",
            "faceapi",
            "picasafile"
        ],
        "fileName": "F:/playground/mytb-test/mytbmediabase//pics_full/import-XXXX_20190717/20190714_224039.jpg",
        "refId": "IMAGE_67472",
        "state": "OPEN"
    },
    "results": [
        {
            "detector": "tfjs_cocossd_mobilenet_v1",
            "key": "person",
            "keySuggestion": "person",
            "state": "RUNNING_SUGGESTED",
            "objX": 1428.9286003112793,
            "objY": 765.2194948196411,
            "objWidth": 2914.368782043457,
            "objHeight": 2132.4691586494446,
            "precision": 0.9085174798965454,
            "imgWidth": 5312,
            "imgHeight": 2988,
            "fileName": "F:/playground/mytb-test/mytbmediabase//pics_full/import-XXXX_20190717/20190714_224039.jpg"
        },
        {
            "detector": "faceapi",
            "key": "CommonFace",
            "keySuggestion": "CommonFace",
            "state": "RUNNING_SUGGESTED",
            "objX": 1711.2515754699707,
            "objY": 834.7949705123901,
            "objWidth": 395.0801773071289,
            "objHeight": 273.8021011352538,
            "precision": 0.6166600584983826,
            "imgWidth": 5312,
            "imgHeight": 2988,
            "fileName": "F:/playground/mytb-test/mytbmediabase//pics_full/import-XXXX_20190717/20190714_224039.jpg"
        }
    ],
    "responseCode": "OK"
}
```
