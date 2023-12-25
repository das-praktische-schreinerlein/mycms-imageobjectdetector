SET SCRIPTPATH=%~dp0

cd %SCRIPTPATH%
npm run run-all-queue-detector -- --mode=gpu --parallelizeDetector 10 --useDirectoryCache --debug 1
