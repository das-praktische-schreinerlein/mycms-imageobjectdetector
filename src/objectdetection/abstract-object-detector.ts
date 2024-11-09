import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import {Tensor3D} from '@tensorflow/tfjs-core';
import {TensorUtils} from './utils/tensor-utils';

export enum DetectorInputRequirement {
    IMAGEDIMENSION, IMAGEDATA, TENSOR
}

export abstract class AbstractObjectDetector {

    public abstract initDetector(): Promise<boolean>;

    public detectFromImageUrl(imageUrl: string): Promise<ObjectDetectionDetectedObject[]> {
        return new Promise<ObjectDetectionDetectedObject[]>((resolve, reject) => {
            TensorUtils.readImageFromLocation(imageUrl).then(posenetInput => {
                this.detectFromCommonInput(posenetInput, imageUrl).then(detectedObjects => {
                    return resolve(detectedObjects);
                }).catch(error => {
                    return reject('ERROR - detecting objects with ' + this.getDetectorId() + ' on location:' + imageUrl + ' - ' + error);
                });
            }).catch(error => {
                return reject('ERROR - detecting objects with ' + this.getDetectorId() + ' on location:' + imageUrl + ' - ' + error);
            });
        });
    }

    public detectFromTensor(tensor: Tensor3D, imageUrl: string): Promise<ObjectDetectionDetectedObject[]> {
        return this.detectFromCommonInput(tensor, imageUrl);
    }

    public abstract detectFromCommonInput(input: Tensor3D|ImageData, imageUrl: string): Promise<ObjectDetectionDetectedObject[]>;

    public abstract getExpectedInputRequirements(): DetectorInputRequirement;

    public abstract getDetectorId(): string;

    public abstract getModelFileNames(): string[];

    public abstract getModelBaseUrl(): string;

    public getModelBaseUrlSuffix(): string {
        return '';
    }
    public abstract getModelAssetsDir(): string;
}
