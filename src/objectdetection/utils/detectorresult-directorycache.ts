import {
    AbstractDetectorResultCacheService,
    DetectorResultCacheEntry,
    DetectorResultsCacheType
} from '@dps/mycms-commons/dist/commons/services/objectdetectionresult-cache';
import {FileUtils} from '../../common/utils/file-utils';
import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import {compress, decompress} from '@mongodb-js/zstd';
import * as fs from 'fs';

export class DetectorResultDirectoryCacheService extends AbstractDetectorResultCacheService {
    constructor(readOnly: boolean, forceUpdate: boolean, private checkCache: boolean) {
        super(readOnly, forceUpdate);
    }

    public readImageCache(imagePath: string, returnNewIfNotExists: boolean): Promise<DetectorResultsCacheType> {
        const cacheFileName = this.getCacheFileNameForImagePath(imagePath);
        return this.readImageCacheFile(cacheFileName, returnNewIfNotExists);
    }

    public readImageCacheFile(cacheFileName: string, returnNewIfNotExists: boolean): Promise<DetectorResultsCacheType> {
        const zstdFileName = cacheFileName + '.zstd';
        const startdate = new Date();

        let zstdPromise: Promise<DetectorResultsCacheType>;
        try {
            if (FileUtils.checkConcreteFile(zstdFileName)) {
                const src = fs.readFileSync(zstdFileName);
                const buffer = Buffer.from(src);
                zstdPromise = decompress(buffer).then(decompressed => {
                    const cache: DetectorResultsCacheType = JSON.parse(decompressed.toString('utf-8'));
                    console.log('use zstd-cache', zstdFileName, src.length, 'Bytes', decompressed.length, 'Bytes',
                        new Date().getTime() - startdate.getTime(), 'ms');
                    return Promise.resolve(cache);
                }).catch(error => {
                    console.warn('cant read zstd-cache:', zstdFileName, error, src.length, 'Bytes', buffer.length, 'Bytes');
                    return Promise.reject('cant read zstd-cache');
                })
            } else {
                zstdPromise = Promise.reject('no active zstd-cache');
            }
        } catch (error) {
            console.log('cant check zstd-cache:', zstdFileName, error);
            zstdPromise = Promise.reject('no active zstd-cache');
        }

        return zstdPromise.catch(() => {
            try {
                const decompressed = FileUtils.readConcreteFileSync(cacheFileName, {encoding: 'utf-8'});
                const cache: DetectorResultsCacheType = JSON.parse(decompressed);
                console.log('use raw-cache', cacheFileName, decompressed.length, 'Bytes',
                    new Date().getTime() - startdate.getTime(), 'ms');
                return Promise.resolve(cache);
            } catch (err) {
                console.warn('cant read raw-cache:', err);
                return Promise.resolve(undefined);
            }
        }).then(cache => {
            if (!cache && returnNewIfNotExists) {
                cache = {
                    detectors: {},
                    updateDate: new Date(),
                    version: 'v1'
                }
            }

            return Promise.resolve(cache);
        })
    }

    public writeImageCache(imagePath: string, detectorResultCache: DetectorResultsCacheType): Promise<boolean> {
        if (this.readonly) {
            return Promise.resolve(false);
        }

        const cacheFileName = this.getCacheFileNameForImagePath(imagePath);
        const zstdFileName = cacheFileName + '.zstd';
        const json = JSON.stringify(detectorResultCache);
        const buffer = Buffer.from(json);
        const startDate = new Date();
        return compress(buffer, 2).then((compressed) => {
            let checkPromise: Promise<boolean>;
            if (this.checkCache) {
                checkPromise = decompress(compressed).then((decompressed) => {
                    if (decompressed.toString('utf-8') !== json) {
                        console.warn('cant write zstd-cache error while checking:', zstdFileName, 'decompressed differ');
                        return Promise.reject('cant write zstd-cache');
                    }

                    return Promise.resolve(true);
                }).catch((error) => {
                    console.warn('cant write zstd-cache error while checking:', zstdFileName, error);
                    return Promise.reject('cant write zstd-cache');
                })
            } else {
                checkPromise = Promise.resolve(true);
            }

            return checkPromise.then(() => {
                FileUtils.writeConcreteFileSync(zstdFileName, compressed);
                console.log('wrote zstd-cache', zstdFileName, buffer.length, 'Bytes', compressed.length, 'Bytes',
                    new Date().getTime() - startDate.getTime(), 'ms');
                return Promise.resolve(true);
            })
        }).catch(error => {
            console.warn('cant write zstd-cache:', zstdFileName, error);
            return Promise.reject('cant write zstd-cache');
        });
    }

    public getImageCacheEntry(detectorResultCache: DetectorResultsCacheType, detectorId: string, imagePath: string): DetectorResultCacheEntry {
        // DirectoryCache uses relative filenames
        const cacheEntry: DetectorResultCacheEntry =  super.getImageCacheEntry(detectorResultCache, detectorId, FileUtils.getFilenameFromFilePath(imagePath));
        if (cacheEntry) {
            cacheEntry.imagePath = FileUtils.getFilenameFromFilePath(cacheEntry.imagePath);
            if (cacheEntry.results) {
                for (let i = 0; i < cacheEntry.results.length; i++) {
                    cacheEntry.results[i].fileName = FileUtils.getFilenameFromFilePath(cacheEntry.results[i].fileName);
                }
            }
        }

        return cacheEntry;
    }

    public setImageCacheEntry(detectorResultCache: DetectorResultsCacheType, detectorId: string, imagePath: string,
                              detectedObjects: ObjectDetectionDetectedObject[]): DetectorResultsCacheType {
        // DirectoryCache uses relative filenames
        if (detectedObjects) {
            for (let i = 0; i < detectedObjects.length; i++) {
                detectedObjects[i].fileName = FileUtils.getFilenameFromFilePath(detectedObjects[i].fileName);
            }
        }

        return super.setImageCacheEntry(detectorResultCache, detectorId, FileUtils.getFilenameFromFilePath(imagePath), detectedObjects);
    }

    protected getCacheFileNameForImagePath(imagePath: string): string {
        return FileUtils.getDirectoryFromFilePath(imagePath) + '.mycmsod-cache.json';
    }
}
