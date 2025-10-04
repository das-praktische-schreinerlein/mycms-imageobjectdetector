# Install 

## install cuda for gpu-support
install cuda for gpu-support https://www.tensorflow.org/install/gpu
- tfjs-node-gpu 4.22.0 requires tensorflow 2.9.1 which requires cuda11.8 and cudnn8 for cuda11
- https://developer.nvidia.com/cuda-11-8-0-download-archive?target_os=Windows&target_arch=x86_64&target_version=11
- https://developer.nvidia.com/rdp/cudnn-archive 8.9.7 for CUDA 11
- set paths
```bash
set PATH=%PATH%;C:\Program Files\NVIDIA Corporation\NVIDIA NvDLISR;
set PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin;
set PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\lib\x64;
set PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\extras\CUPTI\libx64;
set PATH=%PATH%;F:\ProgrammePortable\cudnn8.9.7.29_for_cuda11\bin;
set PATH=%PATH%;F:\ProgrammePortable\cudnn8.9.7.29_for_cuda11\lib\x64;
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
npm install --legacy-peer-deps && npm prune --legacy-peer-deps
```
- possible patch changes
```bash
npx patch-package @tensorflow/tfjs-node
npx patch-package @tensorflow/tfjs-node-gpu
npx patch-package @tensorflow-models/coco-ssd
npx patch-package @tensorflow-models/mobilenet
npx patch-package @tensorflow-models/posenet
```
- afterwards fix dll see [https://github.com/tensorflow/tfjs/issues/4116](https://github.com/tensorflow/tfjs/issues/4116)
```
mv node_modules/@tensorflow/tfjs-node-gpu/lib/napi-v9/tensorflow.dll node_modules/@tensorflow/tfjs-node-gpu/lib/napi-v8/
mv node_modules/@tensorflow/tfjs-node/lib/napi-v9/tensorflow.dll node_modules/@tensorflow/tfjs-node/lib/napi-v8/
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
