import {BaseObjectDetectionImageObjectRecord} from '@dps/mycms-commons/dist/search-commons/model/records/baseobjectdetectionimageobject-record';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {MobileNet, MobileNetAlpha, MobileNetVersion} from '@tensorflow-models/mobilenet';
import {Tensor3D} from '@tensorflow/tfjs';
import {AbstractObjectDetector, DetectorInputRequirement} from '../abstract-object-detector';
import {DetectorResultUtils} from '../utils/detectorresult-utils';
import {TensorUtils} from '../utils/tensor-utils';
import {LogUtils} from "@dps/mycms-commons/dist/commons/utils/log.utils";


export class TFJsMobilenetObjectDetector extends AbstractObjectDetector {
    private detector: MobileNet;
    private mobileNetVersion: MobileNetVersion = 1;
    private mobileNetAlpha: MobileNetAlpha = 1;
    private BASEURL = 'https://storage.googleapis.com/tfhub-tfjs-modules/google/imagenet/';
    private assetsDir = 'assets/models/mobilenet/';
    private maxPredictionNumber = 1;
    private readonly rootDir: string;

    constructor (rootDir: string) {
        super();
        this.rootDir = rootDir;
    }

    getDetectorId(): string {
        return 'tfjs_mobilenet_v' + this.mobileNetVersion;
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
            mobilenet.load(this.mobileNetVersion, this.mobileNetAlpha, this.getModelBasePath() + 'model.json').then(model => {
                this.detector = model;

                return resolve(true);
            }, reason => {
                console.error('ERROR - initialising ' + this.getDetectorId() + '-detector', reason);
                return reject('ERROR - initialising ' + this.getDetectorId() + '-detector - ' + reason);
            });
        });
    }

    detectFromCommonInput(input: Tensor3D|ImageData, imageUrl: string): Promise<BaseObjectDetectionImageObjectRecord[]> {
        return new Promise<BaseObjectDetectionImageObjectRecord[]>((resolve, reject) => {
            this.detector.classify(input, this.maxPredictionNumber).then(predictions => {
                const detectedObjects: BaseObjectDetectionImageObjectRecord[] = [];
                for (let i = 0; i < predictions.length; i++) {
                    detectedObjects.push(
                        DetectorResultUtils.convertMobileNetClassToBaseObjectDetectionImageObjectRecord(
                            this, predictions[i], imageUrl, TensorUtils.getImageDimensionsFromCommonInput(input)));
                }

                return resolve(detectedObjects);
            }).catch(error => {
                console.error('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + LogUtils.sanitizeLogMsg(imageUrl), error);
                return reject('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + imageUrl + ' - ' + error);
            });
        });
    }

    protected getModelDirectoryName(): string {
        return 'mobilenet_v' + this.mobileNetVersion + '_100_224/classification/1/';
    }

    protected getModelBasePath(): string {
        return this.rootDir + this.assetsDir + this.getModelDirectoryName();
    }

}
