import {BaseObjectDetectionImageObjectRecord} from '@dps/mycms-commons/dist/search-commons/model/records/baseobjectdetectionimageobject-record';

export interface DetectorResultCacheEntry {
    imagePath: string;
    updateDate: Date;
    results: BaseObjectDetectionImageObjectRecord[]
}
export interface DetectorResultCacheEntries {
    [index: string]: DetectorResultCacheEntry
}
export interface DetectorResultsCacheEntry {
    detectorId: string;
    updateDate: Date;
    images: DetectorResultCacheEntries
}
export interface DetectorResultsCacheEntries {
    [index: string]: DetectorResultsCacheEntry
}
export interface DetectorResultsCacheType {
    version: string;
    updateDate: Date;
    detectors: DetectorResultsCacheEntries
}

export abstract class AbstractDetectorResultCacheService {
    protected readonly readonly: boolean;
    protected readonly forceUpdate: boolean;

    constructor(readOnly: boolean, forceUpdate: boolean) {
        this.readonly = readOnly;
        this.forceUpdate = forceUpdate;
    }

    public abstract readImageCache(imagePath: string, returnEmtyIfNotExists: boolean): DetectorResultsCacheType;

    public abstract writeImageCache(imagePath: string, detectorResultCache: DetectorResultsCacheType): void;

    public getImageCacheEntry(detectorResultCache: DetectorResultsCacheType, detectorId: string, imagePath: string): DetectorResultCacheEntry {
        if (this.forceUpdate) {
            return;
        }
        if (!detectorResultCache) {
            return null;
        }
        if (detectorResultCache.detectors[detectorId] && detectorResultCache.detectors[detectorId].images[imagePath]) {
            return detectorResultCache.detectors[detectorId].images[imagePath];
        }

        return null;
    }

    public setImageCacheEntry(detectorResultCache: DetectorResultsCacheType, detectorId: string, imagePath: string,
                                     detectedObjects: BaseObjectDetectionImageObjectRecord[]): DetectorResultsCacheType {
        if (this.readonly) {
            return;
        }

        if (!detectorResultCache) {
            return null;
        }

        if (!detectorResultCache.detectors[detectorId]) {
            detectorResultCache.detectors[detectorId] = {
                detectorId: detectorId,
                updateDate: new Date(),
                images: {}
            };
        }

        if (!detectorResultCache.detectors[detectorId].images[imagePath]) {
            detectorResultCache.detectors[detectorId].images[imagePath] = {
                imagePath: imagePath,
                updateDate: new Date(),
                results: []
            }
        }

        detectorResultCache.detectors[detectorId].updateDate = new Date();
        detectorResultCache.detectors[detectorId].images[imagePath].updateDate = new Date();
        detectorResultCache.detectors[detectorId].images[imagePath].results = detectedObjects;

        return null;
    }
}