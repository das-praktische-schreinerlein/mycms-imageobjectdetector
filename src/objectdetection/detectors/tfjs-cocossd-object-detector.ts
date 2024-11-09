import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import {ModelConfig, ObjectDetection, ObjectDetectionBaseModel} from '@tensorflow-models/coco-ssd';
import {Tensor3D} from '@tensorflow/tfjs-core';
import {AbstractObjectDetector, DetectorInputRequirement} from '../abstract-object-detector';
import {DetectorResultUtils} from '../utils/detectorresult-utils';
import {TensorUtils} from '../utils/tensor-utils';


export class TFJsCocossdObjectDetector extends AbstractObjectDetector {
    private detector: ObjectDetection;
    private readonly modelName: ObjectDetectionBaseModel;
    private BASEURL = 'https://storage.googleapis.com/tfjs-models/savedmodel/';
    private assetsDir = 'assets/models/cocossd/';
    private readonly rootDir: string;

    constructor (rootDir: string, modelName: ObjectDetectionBaseModel) {
        super();
        this.modelName = modelName;
        this.rootDir = rootDir;
    }

    getDetectorId(): string {
        return 'tfjs_cocossd_' + this.modelName;
    }

    getExpectedInputRequirements(): DetectorInputRequirement {
        return DetectorInputRequirement.TENSOR;
    }

    getModelBaseUrl(): string {
        return this.BASEURL;
    }

    getModelAssetsDir(): string {
        return this.assetsDir;
    }

    getModelFileNames(): string[] {
        return [this.getModelDirectoryName() + 'model.json'];
    }

    initDetector(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const modelConfig: ModelConfig = {
                base: this.modelName,
                modelUrl: this.getModelBasePath() + 'model.json'
            }

            return cocoSsd.load(modelConfig).then(model => {
                this.detector = model;

                return resolve(true);
            }, reason => {
                console.error('ERROR - initialising ' + this.getDetectorId() + '-detector', reason);
                return reject('ERROR - initialising ' + this.getDetectorId() + '-detector - ' + reason);
            });
        });
    }

    detectFromCommonInput(input: Tensor3D|ImageData, imageUrl: string): Promise<ObjectDetectionDetectedObject[]> {
        return new Promise<ObjectDetectionDetectedObject[]>((resolve, reject) => {
            return this.detector.detect(input).then(predictions => {
                const detectedObjects: ObjectDetectionDetectedObject[] = [];
                for (let i = 0; i < predictions.length; i++) {
                    detectedObjects.push(
                        DetectorResultUtils.convertDetectedObjectToObjectDetectionDetectedObject(
                            this, predictions[i], imageUrl, TensorUtils.getImageDimensionsFromCommonInput(input)));
                }
                input = undefined;

                return resolve(detectedObjects);
            }).catch(error => {
                console.error('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:', imageUrl, error);
                input = undefined;
                return reject('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + imageUrl + ' - ' + error);
            });
        });
    }

    protected getModelDirectoryName(): string {
        return 'ssd' + (this.modelName !== 'lite_mobilenet_v2' ? '_' : '') + this.modelName + '/';
    }


    protected getModelBasePath(): string {
        return this.rootDir + this.assetsDir + this.getModelDirectoryName();
    }

}
