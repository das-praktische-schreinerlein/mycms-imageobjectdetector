import {
    AbstractDetectorResultCacheService,
    DetectorResultsCacheType
} from '@dps/mycms-commons/dist/commons/services/objectdetectionresult-cache';
import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import * as Promise_serial from 'promise-serial';
import {TensorUtils} from './tensor-utils';
import {isArray} from 'util';
import * as fs from 'fs';
import * as download from 'download';
import * as mkdirp from 'mkdirp';
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

            Promise_serial(funcs, {parallelize: 1}).then(arrayOfResults => {
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
                                     breakOnError: boolean): Promise<ObjectDetectionDetectedObject[]> {
        return new Promise<ObjectDetectionDetectedObject[]>((resolve, reject) => {
            let detectorResultCache: DetectorResultsCacheType = undefined;
            if (detectorResultCacheService) {
                detectorResultCache = detectorResultCacheService.readImageCache(imageUrl, true);
            }

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

            let dataPromise: Promise<Tensor3D|ImageData>;
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
                    funcs.push(function () {
                        return new Promise<ObjectDetectionDetectedObject[]>((processorResolve, processorReject) => {
                            const cacheEntry = detectorResultCacheService ? detectorResultCacheService.getImageCacheEntry(detectorResultCache, detector.getDetectorId(), imageUrl): undefined;
                            if (cacheEntry) {
                                return processorResolve(cacheEntry.results)
                            }

                            detector.detectFromCommonInput(input, imageUrl)
                                .then(detectedObjects => {
                                    cacheUpdated = true;
                                    if (detectedObjects) {
                                        detectorResultCacheService ? detectorResultCacheService.setImageCacheEntry(detectorResultCache, detector.getDetectorId(), imageUrl, detectedObjects) : undefined;
                                    }

                                    return processorResolve(detectedObjects);
                                })
                                .catch(reason => {
                                    return breakOnError ? processorReject(reason) : processorResolve(undefined);
                                });
                        })
                    });
                }

                Promise_serial(funcs, {parallelize: 1}).then(arrayOfDetectorResults => {
                    let detectedObjects: ObjectDetectionDetectedObject[] = undefined;
                    for (let i = 0; i < arrayOfDetectorResults.length; i++) {
                        const detectorResult: ObjectDetectionDetectedObject[] = arrayOfDetectorResults[i];
                        if (detectorResult) {
                            if (!detectedObjects) {
                                detectedObjects = []
                            }
                            for (let s = 0; s < detectorResult.length; s++) {
                                detectedObjects.push(detectorResult[s]);
                            }
                        }
                    }

                    if (cacheUpdated && detectorResultCacheService) {
                        detectorResultCacheService.writeImageCache(imageUrl, detectorResultCache);
                    }

                    return resolve(detectedObjects);
                }).catch(reason => {
                    return reject(reason);
                });
            }).catch(reason => {
                return breakOnError ? reject(reason) : resolve(undefined);
            })
        });
    };

    public static downloadDetectorModelFiles(detector: AbstractObjectDetector): Promise<boolean> {
        return new Promise<boolean>((processorResolve, processorReject) => {
            const modelFiles = [];
            const detectorModelFiles = detector.getModelFileNames();
            for (const modelFile of detectorModelFiles) {
                modelFiles.push(modelFile);
            }

            DetectorUtils.downLoadModelFiles(detector.getModelBaseUrl(), modelFiles, detector.getModelAssetsDir()).then((subFiles) => {
                console.log('DONE - ' + detector.getDetectorId() + '-basefiles downloaded!');
                if (subFiles.length > 0) {
                    DetectorUtils.downLoadModelFiles(detector.getModelBaseUrl(), subFiles, detector.getModelAssetsDir()).then((subFiles) => {
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

    public static downLoadModelFiles(baseUrl: string, files: string[], assetsDir: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const funcs = [];
            for (const path of files) {
                funcs.push(function () {
                    return new Promise<string>((processorResolve, processorReject) => {
                        console.error('download', path);
                        return download(baseUrl + path).then(data => {
                            const subFiles = [];
                            const dir = FileUtils.getDirectoryFromFilePath(path);
                            const absDir = assetsDir + dir;
                            const absPath = assetsDir + path;

                            return new Promise<any>((mkdirpResolve, mkdirpReject) => {
                                mkdirp(absDir, function (err) {
                                    if (err) {
                                        console.error(err);
                                        mkdirpReject(err);
                                        return;
                                    }

                                    fs.writeFileSync(absPath, data);

                                    if (path.endsWith('/model.json')) {
                                        // Posenet
                                        const config: {} = JSON.parse(data);
                                        if (isArray(config['weightsManifest'])) {
                                            const weightsConfig = config['weightsManifest'];
                                            for (let i = 0; i < weightsConfig.length; i++) {
                                                if (weightsConfig[i] && weightsConfig[i]['paths']) {
                                                    for (let s = 0; s < weightsConfig[i]['paths'].length; s++) {
                                                        console.error('add subfile', dir + '/' + weightsConfig[i]['paths'][s]);
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
                                                    console.error('add subfile', dir + '/' + weightsConfig[attr]['filename']);
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
                                                        console.error('add subfile', dir + '/' + weightsConfig[i]['paths'][s]);
                                                        subFiles.push(dir + weightsConfig[i]['paths'][s]);
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    return mkdirpResolve(subFiles);
                                });
                            }).then(value => {
                                return processorResolve(value);
                            }).catch(reason => {
                                return processorReject(reason);
                            })
                        }).catch(reason => {
                            return processorReject(reason);
                        })
                    });
                });

            }

            Promise_serial(funcs, {parallelize: 1}).then(arrayOfResults => {
                const subFiles = [];
                for (let i = 0; i < arrayOfResults.length; i++) {
                    for (let s = 0; s < arrayOfResults[i].length; s++) {
                        console.error('add subfile of result', arrayOfResults[i][s]);
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
}