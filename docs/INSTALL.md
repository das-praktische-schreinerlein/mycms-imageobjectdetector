# Install 

## install cuda for gpu-support
install cuda for gpu-support https://www.tensorflow.org/install/gpu
- tfjs-nnode-gpu 0.3.1 required cuda9 and cudnn7 for cuda9
- https://developer.nvidia.com/cuda-90-download-archive?target_os=Windows&target_arch=x86_64&target_version=10&target_type=exelocal
- https://developer.nvidia.com/rdp/cudnn-download
- set paths
```bash
set PATH=%PATH%;C:\Program Files\NVIDIA Corporation\NVIDIA NvDLISR;
set PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v9.0\bin;
set PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v9.0\lib\x64;
set PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v9.0\extras\CUPTI\libx64;
set PATH=%PATH%;D:\ProgrammePortable\cuda7_for9\bin;
set PATH=%PATH%;D:\ProgrammePortable\cuda7_for9\lib\x64;
```

## prepare tensorflow-usage
- install microsoft build tools 
```bash
f:
cd \Tmp
"C:\Program Files (x86)\Microsoft Visual Studio\Installer\resources\app\layout\InstallCleanup.exe" -full
rem npm install --global --production windows-build-tools
npm install --global --production --vs2015 windows-build-tools
```
- install project
```bash
cd \Projekte\mycms-objectdetector\
npm install && npm prune
```
- possible patch changes
```bash
npx patch-package @tensorflow/tfjs-node
npx patch-package @tensorflow/tfjs-node-gpu
npx patch-package @tensorflow-models/coco-ssd
npx patch-package @tensorflow-models/mobilenet
npx patch-package @tensorflow-models/posenet
```

## do prepare environment

- build
```bash
npm run build
```
- clear and download new models
```bash
npm run clear-models && npm run download-all-models
```
