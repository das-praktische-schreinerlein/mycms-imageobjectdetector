import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import * as faceapi from 'face-api.js';
import {FaceDetection} from 'face-api.js';
import {Tensor3D} from '@tensorflow/tfjs';
import {AbstractObjectDetector, DetectorInputRequirement} from '../abstract-object-detector';
import {DetectorResultUtils} from '../utils/detectorresult-utils';
import {TensorUtils} from '../utils/tensor-utils';
import {LogUtils} from '@dps/mycms-commons/dist/commons/utils/log.utils';
import {DetectorUtils} from '../utils/detector-utils';


export class FaceApiObjectDetector extends AbstractObjectDetector {
    private BASEURL = 'https://github.com/justadudewhohacks/face-api.js/raw/0.18.0/';
    private assetsDir = 'assets/models/faceapi/';
    private readonly rootDir: string;

    constructor (rootDir: string) {
        super();
        this.rootDir = rootDir;
    }

    getDetectorId(): string {
        return 'faceapi';
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
        return [this.getModelDirectoryName() + 'face_expression_model-shard1',
            this.getModelDirectoryName() + 'face_expression_model-weights_manifest.json',
            this.getModelDirectoryName() + 'ssd_mobilenetv1_model-shard1',
            this.getModelDirectoryName() + 'ssd_mobilenetv1_model-shard2',
            this.getModelDirectoryName() + 'ssd_mobilenetv1_model-weights_manifest.json'];
    }

    initDetector(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const localBasePath = (this.getModelBasePath() + '/').replace(/^file:\/\//, '');
            return faceapi.nets.ssdMobilenetv1.loadFromDisk( localBasePath).then(model => {
                return resolve(true);
            }, reason => {
                console.error('ERROR - initialising ' + this.getDetectorId() + '-detector', reason);
                return reject('ERROR - initialising ' + this.getDetectorId() + '-detector - ' + reason);
            });
        });
    }

    detectFromCommonInput(input: Tensor3D|ImageData, imageUrl: string): Promise<ObjectDetectionDetectedObject[]> {
        return new Promise<ObjectDetectionDetectedObject[]>((resolve, reject) => {
            let localTensor: Tensor3D = input['width'] ? TensorUtils.imageToTensor3D(<ImageData>input, TensorUtils.NUMBER_OF_CHANNELS) : undefined;
            let tensor: Tensor3D = input['width'] ? localTensor : <Tensor3D>input;
            return faceapi.detectAllFaces(tensor).run().then((predictions: FaceDetection[]) => {
                const detectedObjects: ObjectDetectionDetectedObject[] = [];
                for (let i = 0; i < predictions.length; i++) {
                    detectedObjects.push(
                        DetectorResultUtils.convertFaceDetectionToObjectDetectionDetectedObject(
                            this, predictions[i], imageUrl));
                }

                localTensor = DetectorUtils.disposeObj(localTensor);
                input = undefined;
                tensor = undefined;
                return resolve(detectedObjects);
            }).catch(error => {
                localTensor = DetectorUtils.disposeObj(localTensor);
                input = undefined;
                tensor = undefined;
                console.error('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + LogUtils.sanitizeLogMsg(imageUrl), error);
                return reject('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + imageUrl + ' - ' + error);
            });
        });
    }

    protected getModelDirectoryName(): string {
        return 'weights/';
    }

    protected getModelBasePath(): string {
        return this.rootDir + this.assetsDir + this.getModelDirectoryName();
    }

}
