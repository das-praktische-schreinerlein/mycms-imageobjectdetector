import * as fs from 'fs';
import {
    AbstractDetectorResultCacheService,
    DetectorResultCacheEntry,
    DetectorResultsCacheType
} from './detectorresult-cache';
import {FileUtils} from '../../common/utils/file-utils';
import {BaseObjectDetectionImageObjectRecord} from '@dps/mycms-commons/dist/search-commons/model/records/baseobjectdetectionimageobject-record';

export class DetectorResultDirectoryCacheService extends AbstractDetectorResultCacheService {
    constructor(readOnly: boolean, forceUpdate: boolean) {
        super(readOnly, forceUpdate);
    }

    public readImageCache(imagePath: string, returnEmtyIfNotExists: boolean): DetectorResultsCacheType {
        const cacheFileName = this.getCacheFileNameForImagePath(imagePath);
        let cache: DetectorResultsCacheType = undefined;
        try {
            cache = JSON.parse(fs.readFileSync(cacheFileName, {encoding: 'UTF-8'}));
        } catch (err) {
            console.warn('cant read cache:', err);
        }
        if (!cache && returnEmtyIfNotExists) {
            cache = {
                detectors: {},
                updateDate: new Date(),
                version: 'v1'
            }
        }
        return cache;
    }

    public writeImageCache(imagePath: string, detectorResultCache: DetectorResultsCacheType): void {
        if (this.readonly) {
            return;
        }

        const cacheFileName = this.getCacheFileNameForImagePath(imagePath);
        fs.writeFileSync(cacheFileName, JSON.stringify(detectorResultCache));
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
                              detectedObjects: BaseObjectDetectionImageObjectRecord[]): DetectorResultsCacheType {
        // DirectoryCache uses relative filenames
        if (detectedObjects) {
            for (let i = 0; i < detectedObjects.length; i++) {
                detectedObjects[i].fileName = FileUtils.getFilenameFromFilePath(detectedObjects[i].fileName);
            }
        }

        return super.setImageCacheEntry(detectorResultCache, detectorId, FileUtils.getFilenameFromFilePath(imagePath), detectedObjects);
    }

    protected getCacheFileNameForImagePath(imagePath: string): string {
        return FileUtils.getDirectoryFromFilePath(imagePath) + 'mycmsod-cache.json';
    }
}