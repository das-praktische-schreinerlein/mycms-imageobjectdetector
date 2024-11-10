import {
    AbstractDetectorResultCacheService,
    DetectorResultsCacheType
} from '@dps/mycms-commons/dist/commons/services/objectdetectionresult-cache';
import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import * as Promise_serial from 'promise-serial';
import {TensorUtils} from './tensor-utils';
import {isArray} from 'util';
import * as download from 'download';
import mkdirp from 'mkdirp';
import {AbstractObjectDetector, DetectorInputRequirement} from '../abstract-object-detector';
import {FileUtils} from '../../common/utils/file-utils';
import {Tensor3D} from '@tensorflow/tfjs-core';

export class DetectorUtils {
    public static initDetectors(detectors: AbstractObjectDetector[]): Promise<AbstractObjectDetector[]> {
        return new Promise<AbstractObjectDetector[]>((resolve, reject) => {
            const funcs = [];
            for (const detector of detectors) {
                funcs.push(function () {
                    return new Promise<AbstractObjectDetector>((processorResolve, processorReject) => {
                        detector.initDetector().then(value => {
                            return processorResolve(detector);
                        }).catch(reason => {
                            return processorReject(reason);
                        })
                    })
                });
            }

            return Promise_serial(funcs, {parallelize: 1}).then(arrayOfResults => {
                const detectors = [];
                for (let i = 0; i < arrayOfResults.length; i++) {
                    console.log('initialized detector', arrayOfResults[i].getDetectorId());
                }
                return resolve(detectors);
            }).catch(reason => {
                return reject(reason);
            });
        });
    };

    public static detectFromImageUrl(detectors: AbstractObjectDetector[], imageUrl: string,
                                     detectorResultCacheService: AbstractDetectorResultCacheService,
                                     breakOnError: boolean,
                                     parallelize: number): Promise<ObjectDetectionDetectedObject[]> {
        let detectorResultCachePromise: Promise<DetectorResultsCacheType>;

        if (detectorResultCacheService) {
            detectorResultCachePromise = detectorResultCacheService.readImageCache(imageUrl, true).then(result => {
                return Promise.resolve(result);
            }).catch(() => {
                return Promise.reject('error while reading cache');
            });
        } else {
            detectorResultCachePromise = Promise.reject('no cache');
        }

        return detectorResultCachePromise.catch((reason) => {
            console.log('not using cache:', reason);
            return Promise.resolve(undefined);
        }).then((detectorResultCache: DetectorResultsCacheType) => {
            return new Promise<ObjectDetectionDetectedObject[]>((resolve, reject) => {
                // use cached entries if for all detectors exists
                let detectedCachedObjects = undefined;
                let alreadyCached = true;
                let expectedInputRequirements = {};
                for (const detector of detectors) {
                    const cacheEntry = detectorResultCacheService ? detectorResultCacheService.getImageCacheEntry(detectorResultCache, detector.getDetectorId(), imageUrl) : undefined;
                    if (cacheEntry) {
                        if (cacheEntry.results && !detectedCachedObjects) {
                            // result defined: prepare list
                            detectedCachedObjects = [];
                        }
                        for (let s = 0; s < cacheEntry.results.length; s++) {
                            detectedCachedObjects.push(cacheEntry.results[s]);
                        }
                    } else {
                        alreadyCached = false;
                        expectedInputRequirements[detector.getExpectedInputRequirements()] = true;
                        break;
                    }
                }
                if (alreadyCached) {
                    return resolve(detectedCachedObjects);
                }

                let dataPromise: Promise<Tensor3D | ImageData>;
                if (expectedInputRequirements[DetectorInputRequirement.TENSOR]) {
                    dataPromise = TensorUtils.readImageTensorFromLocation(imageUrl);
                } else if (expectedInputRequirements[DetectorInputRequirement.IMAGEDATA]) {
                    dataPromise = TensorUtils.readImageFromLocation(imageUrl);
                } else if (expectedInputRequirements[DetectorInputRequirement.IMAGEDIMENSION]) {
                    dataPromise = TensorUtils.readImageMetaDataFromLocation(imageUrl);
                } else {
                    dataPromise = TensorUtils.readImageTensorFromLocation(imageUrl);
                }

                dataPromise.then(input => {
                    let cacheUpdated = false;
                    const funcs = [];
                    for (const detector of detectors) {
                        funcs.push(async function () {
                            return new Promise<ObjectDetectionDetectedObject[]>((processorResolve, processorReject) => {
                                console.debug('START detector - ', detector.getDetectorId());
                                const startCache = new Date();
                                const cacheEntry = detectorResultCacheService ? detectorResultCacheService.getImageCacheEntry(detectorResultCache, detector.getDetectorId(), imageUrl) : undefined;
                                if (cacheEntry) {
                                    console.debug('SKIPPED cached detector in ' + (new Date().getTime() - startCache.getTime()) + 'ms - ', detector.getDetectorId());
                                    return processorResolve(cacheEntry.results)
                                }

                                const start = new Date();
                                return detector.detectFromCommonInput(input, imageUrl)
                                    .then(detectedObjects => {
                                        cacheUpdated = true;
                                        if (detectedObjects) {
                                            detectorResultCacheService
                                                ? detectorResultCacheService.setImageCacheEntry(detectorResultCache, detector.getDetectorId(), imageUrl, detectedObjects)
                                                : undefined;
                                        }

                                        console.debug('DONE detector in ' + (new Date().getTime() - start.getTime()) + 'ms - ', detector.getDetectorId());
                                        return processorResolve(detectedObjects);
                                    })
                                    .catch(reason => {
                                        return breakOnError ? processorReject(reason) : processorResolve(undefined);
                                    });
                            })
                        });
                    }

                    return Promise_serial(funcs, {parallelize: parallelize}).then(arrayOfDetectorResults => {
                        let detectedObjects: ObjectDetectionDetectedObject[] = undefined;
                        for (let i = 0; i < arrayOfDetectorResults.length; i++) {
                            const detectorResult: ObjectDetectionDetectedObject[] = arrayOfDetectorResults[i];
                            if (detectorResult !== undefined && detectorResult !== null) {
                                if (detectedObjects === undefined) {
                                    detectedObjects = []
                                }

                                for (let s = 0; s < detectorResult.length; s++) {
                                    if (detectorResult[s] !== undefined && detectorResult[s] !== null) {
                                        detectedObjects.push(detectorResult[s]);
                                    }
                                }
                            }
                        }

                        if (cacheUpdated && detectorResultCacheService) {
                            return detectorResultCacheService.writeImageCache(imageUrl, detectorResultCache).then(() => {
                                return Promise.resolve(detectedObjects);
                            }).catch(reason => {
                                return Promise.resolve(detectedObjects);
                            });
                        }

                        return Promise.resolve(detectedObjects);
                    }).then((detectedObjects: ObjectDetectionDetectedObject[]) => {
                        detectedCachedObjects = DetectorUtils.disposeObj(detectedCachedObjects);
                        detectorResultCache = DetectorUtils.disposeObj(detectorResultCache);
                        input = DetectorUtils.disposeObj(input);

                        return resolve(detectedObjects);
                    }).catch(reason => {
                        input = DetectorUtils.disposeObj(input);
                        detectedCachedObjects = DetectorUtils.disposeObj(detectedCachedObjects);
                        detectorResultCache = DetectorUtils.disposeObj(detectorResultCache);
                        input = DetectorUtils.disposeObj(input);

                        return reject(reason);
                    });
                }).catch(reason => {
                    detectedCachedObjects = DetectorUtils.disposeObj(detectedCachedObjects);
                    detectorResultCache = DetectorUtils.disposeObj(detectorResultCache);
                    return breakOnError
                        ? reject(reason)
                        : resolve(undefined);
                })
            });
        });
    };

    public static downloadDetectorModelFiles(detector: AbstractObjectDetector): Promise<boolean> {
        return new Promise<boolean>((processorResolve, processorReject) => {
            const modelFiles = [];
            const detectorModelFiles = detector.getModelFileNames();
            for (const modelFile of detectorModelFiles) {
                modelFiles.push(modelFile);
            }

            DetectorUtils.downLoadModelFiles(detector.getModelBaseUrl(), modelFiles, detector.getModelAssetsDir(),
                detector.getModelBaseUrlSuffix()).then((subFiles) => {
                console.log('DONE - ' + detector.getDetectorId() + '-basefiles downloaded!');
                if (subFiles.length > 0) {
                    DetectorUtils.downLoadModelFiles(detector.getModelBaseUrl(), subFiles, detector.getModelAssetsDir(),
                        detector.getModelBaseUrlSuffix()).then((subFiles) => {
                        console.log('DONE - ' + detector.getDetectorId() + '-subfiles downloaded!');
                        return processorResolve(true);
                    }).catch(reason => {
                        console.error('ERROR - cant download ' + detector.getDetectorId() + '-subfiles!', reason);
                        return processorReject(reason);
                    });
                } else {
                    return processorResolve(true);
                }
            }).catch(reason => {
                console.error('ERROR - cant download ' + detector.getDetectorId() + '-basefiles!', reason);
                return processorReject(reason);
            });
        });
    }

    public static downLoadModelFiles(baseUrl: string, files: string[], assetsDir: string, baseUrlSuffix: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const funcs = [];
            for (const path of files) {
                funcs.push(function () {
                    return new Promise<string>((processorResolve, processorReject) => {
                        console.log('download', path, baseUrl + path + baseUrlSuffix);
                        return download(baseUrl + path + baseUrlSuffix).then(data => {
                            const subFiles = [];
                            const dir = FileUtils.getDirectoryFromFilePath(path);
                            const absDir = assetsDir + dir;
                            const absPath = assetsDir + path;

                            return mkdirp(absDir).then(() => {
                                FileUtils.writeConcreteFileSync(absPath, data);

                                if (path.endsWith('/model.json')) {
                                    // Posenet
                                    const config: {} = JSON.parse(data);
                                    if (isArray(config['weightsManifest'])) {
                                        const weightsConfig = config['weightsManifest'];
                                        for (let i = 0; i < weightsConfig.length; i++) {
                                            if (weightsConfig[i] && weightsConfig[i]['paths']) {
                                                for (let s = 0; s < weightsConfig[i]['paths'].length; s++) {
                                                    console.log('add subfile', dir + '/' + weightsConfig[i]['paths'][s]);
                                                    subFiles.push(dir + weightsConfig[i]['paths'][s]);
                                                }
                                            }
                                        }
                                    }
                                } else if (path.endsWith('/manifest.json')) {
                                    // Posenet
                                    const weightsConfig: {} = JSON.parse(data);
                                    if (!isArray(weightsConfig)) {
                                        for (const attr in weightsConfig) {
                                            if (weightsConfig[attr] && weightsConfig[attr]['filename']) {
                                                console.log('add subfile', dir + '/' + weightsConfig[attr]['filename']);
                                                subFiles.push(dir + weightsConfig[attr]['filename']);
                                            }
                                        }
                                    }
                                } else if (path.endsWith('.json')) {
                                    // cocossd
                                    const weightsConfig: {} = JSON.parse(data);
                                    if (isArray(weightsConfig)) {
                                        for (let i = 0; i < weightsConfig.length; i++) {
                                            if (weightsConfig[i] && weightsConfig[i]['paths']) {
                                                for (let s = 0; s < weightsConfig[i]['paths'].length; s++) {
                                                    console.log('add subfile', dir + '/' + weightsConfig[i]['paths'][s]);
                                                    subFiles.push(dir + weightsConfig[i]['paths'][s]);
                                                }
                                            }
                                        }
                                    }
                                }

                                return subFiles;
                            });
                        }).then(value => {
                            return processorResolve(value);
                        }).catch(reason => {
                            return processorReject(reason);
                        });
                    });
                });
            }

            return Promise_serial(funcs, {parallelize: 1}).then(arrayOfResults => {
                const subFiles = [];
                for (let i = 0; i < arrayOfResults.length; i++) {
                    for (let s = 0; s < arrayOfResults[i].length; s++) {
                        console.log('add subfile of result', arrayOfResults[i][s]);
                        subFiles.push(arrayOfResults[i][s]);
                    }
                }
                return resolve(subFiles);
            }).catch(reason => {
                return reject(reason);
            });
        });
    };

    public static getDetectorIds(detectors: AbstractObjectDetector[]): string[] {
        const ids = [];
        for (const detector of detectors) {
            ids.push(detector.getDetectorId());
        }

        return ids;
    }

    public static disposeObj(object: any): any {
        if (object && object['dispose']) {
            return object['dispose']();
        }

        return undefined;
    }
}
