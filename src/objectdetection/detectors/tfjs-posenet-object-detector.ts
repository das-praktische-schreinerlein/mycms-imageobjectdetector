import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import {Tensor3D} from '@tensorflow/tfjs-core';
import * as posenet from '@tensorflow-models/posenet';
import {MobileNetMultiplier, MultiPersonInferenceConfig, PoseNet, PoseNetOutputStride} from '@tensorflow-models/posenet';
import {AbstractObjectDetector, DetectorInputRequirement} from '../abstract-object-detector';
import {DetectorResultUtils} from '../utils/detectorresult-utils';
import {TensorUtils} from '../utils/tensor-utils';
import {LogUtils} from '@dps/mycms-commons/dist/commons/utils/log.utils';
import {ModelConfig} from '@tensorflow-models/posenet/dist/posenet_model';
import {ExtendedImageData} from '../../common/utils/image-utils';


export class TFJsPosenetObjectDetector extends AbstractObjectDetector {
    private detector: PoseNet;
    private imageScaleFactor = 0.2;
    private outputStride: PoseNetOutputStride = 32;
    private flipHorizontal = false;
    private maxPoseDetections = 2;
    private multiplier: MobileNetMultiplier = 0.75;
    private BASEURL = 'https://storage.googleapis.com/tfjs-models/weights/posenet/';
    private assetsDir = 'assets/models/posenet/';
    private readonly rootDir: string;

    constructor (rootDir: string) {
        super();
        this.rootDir = rootDir;
    }

    getDetectorId(): string {
        return 'tfjs_posenet';
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
        return [this.getModelDirectoryName() + '/manifest.json'];
    }

    initDetector(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            // FIXME imageScaleFactor: this.imageScaleFactor,
            const modelConfig: ModelConfig = {
                inputResolution: undefined, // FIXME
                architecture: 'MobileNetV1',
                outputStride: this.outputStride,
                multiplier: this.multiplier,
            }
            return posenet.load(modelConfig).then(model => {
                this.detector = model;

                return resolve(true);
            }, reason => {
                console.error('ERROR - initialising ' + this.getDetectorId() + '-detector', reason);
                return reject('ERROR - initialising ' + this.getDetectorId() + '-detector - ' + reason);
            });
        });
    }

    detectFromCommonInput(input: Tensor3D|ExtendedImageData, imageUrl: string): Promise<ObjectDetectionDetectedObject[]> {
        return new Promise<ObjectDetectionDetectedObject[]>((resolve, reject) => {
            const config: MultiPersonInferenceConfig = {
                flipHorizontal: this.flipHorizontal,
                maxDetections: this.maxPoseDetections,
            }

            return this.detector.estimateMultiplePoses(input, config).then(predictions => {
                const detectedObjects: ObjectDetectionDetectedObject[] = [];
                for (let i = 0; i < predictions.length; i++) {
                    detectedObjects.push(
                        DetectorResultUtils.convertPoseToObjectDetectionDetectedObject(
                            this, predictions[i], imageUrl, TensorUtils.getImageDimensionsFromCommonInput(input), i, input));
                }

                input = undefined;
                return resolve(detectedObjects);
            }).catch(error => {
                input = undefined;
                console.error('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + LogUtils.sanitizeLogMsg(imageUrl), error);
                return reject('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + imageUrl + ' - ' + error);
            });
        });
    }

    protected getModelDirectoryName(): string {
        return 'mobilenet_v1_075';
    }

    protected getModelBasePath(): string {
        return this.rootDir + this.assetsDir + this.getModelDirectoryName();
    }
}
