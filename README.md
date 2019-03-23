# MyCMS-ObjectDetection

MyCMS is a library for developing CMS-applications with ObjectDetection.
It's the software-stack behind the new portal-version [www.michas-ausflugstipps.de](https://www.michas-ausflugstipps.de/). 

For more information take a look at documentation:
- [changelog](docs/CHANGELOG.md) 
- [credits for used libraries](docs/CREDITS.md)


# Install 

## install cuda for gpu-support
install cuda for gpu-support https://www.tensorflow.org/install/gpu
- tfjs-nnode-gpu 0.3.1 required cuda9 and cudnn7 for cuda9
- https://developer.nvidia.com/cuda-90-download-archive?target_os=Windows&target_arch=x86_64&target_version=10&target_type=exelocal
- https://developer.nvidia.com/rdp/cudnn-download
- set paths
```
set PATH=%PATH%;C:\Program Files\NVIDIA Corporation\NVIDIA NvDLISR;
set PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v9.0\bin;
set PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v9.0\lib\x64;
set PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v9.0\extras\CUPTI\libx64;
set PATH=%PATH%;D:\ProgrammePortable\cuda7_for9\bin;
set PATH=%PATH%;D:\ProgrammePortable\cuda7_for9\lib\x64;
```

## prepare tensorflow-usage
- install microsoft build tools 
```
f:
cd \Tmp
"C:\Program Files (x86)\Microsoft Visual Studio\Installer\resources\app\layout\InstallCleanup.exe" -full
rem npm install --global --production windows-build-tools
npm install --global --production --vs2015 windows-build-tools
```
- install project
```
cd \Projekte\mycms-objectdetector\
npm install && npm prune
```
- possible patch changes
```
npx patch-package @tensorflow/tfjs-node
npx patch-package @tensorflow/tfjs-node-gpu
npx patch-package @tensorflow-models/coco-ssd
npx patch-package @tensorflow-models/mobilenet
npx patch-package @tensorflow-models/posenet
```

# do run

- build
```
npm run build
```
- clear and download new models
```
npm run clear-models && npm run download-all-models
```

## run detector on directory
- run common detectors 
```
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10
```
- run common detectors with cache 
```
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --useDirectoryCache
```
- run common detectors with different modes (default is mode=node)
```
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=browser --parallelizeDetector 10
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=node --parallelizeDetector 10
npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10
```
- run selected detectors 
```
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --detectors=tfjs_posenet,tfjs_mobilenet_v1
```
- run selected detectors with cache 
```
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --detectors=tfjs_posenet,tfjs_mobilenet_v1 --useDirectoryCache
```
- run selected detectors with cache and force cache-update
```
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --detectors=tfjs_posenet,tfjs_mobilenet_v1 --useDirectoryCache --forceUpdateDirectoryCache 
```
- run selected detectors with cache, but dont update non existing entries
```
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --mode=gpu --parallelizeDetector 10 --detectors=tfjs_posenet,tfjs_mobilenet_v1 --useDirectoryCache --directoryCacheReadOnly
```
- run selected detectors and break on any error
```
npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src/bla --debug 1 --detectors=tfjs_posenet,tfjs_mobilenet_v1 --breakOnError
```

## run detector as queued-service
- start it with same options as imagefile-detector
```
npm run run-all-queue-detector --useDirectoryCache --mode=gpu --parallelizeDetector 10 --debug 1
```