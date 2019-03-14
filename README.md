# MyCMS-ObjectDetection

MyCMS is a library for developing CMS-applications with ObjectDetection.
It's the software-stack behind the new portal-version [www.michas-ausflugstipps.de](https://www.michas-ausflugstipps.de/). 

For more information take a look at documentation:
- [changelog](docs/CHANGELOG.md) 
- [credits for used libraries](docs/CREDITS.md)

# prepare tensorflow-usage
f:
cd \Tmp
"C:\Program Files (x86)\Microsoft Visual Studio\Installer\resources\app\layout\InstallCleanup.exe" -full
rem npm install --global --production windows-build-tools
npm install --global --production --vs2015 windows-build-tools

cd \Projekte\mycms-objectdetector\
npm install

# prepare patch
npx patch-package @tensorflow/tfjs-node
npx patch-package @tensorflow-models/coco-ssd
npx patch-package @tensorflow-models/mobilenet
npx patch-package @tensorflow-models/posenet

# do run
npm install && npm prune && npm link @dps/mycms-commons && npm run build && npm run clear-models && npm run download-all-models && npm run run-all-imagefile-detector -- --sourceDir f:/tmp/image-src --debug 
npm run build && npm run clear-models && npm run download-all-models && npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src --debug
npm run build && npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src --debug --useDirectoryCache
npm run build && npm run run-imagefile-detector -- --sourceDir f:/tmp/image-src --debug --detectors=tfjs_posenet --useDirectoryCache

npm run clear-models && npm run download-all-models && npm run run-common-imagefile-detector -- --sourceDir f:/tmp/image-src --debug