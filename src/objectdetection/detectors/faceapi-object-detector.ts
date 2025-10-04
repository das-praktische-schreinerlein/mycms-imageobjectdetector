import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import {Tensor3D} from '@tensorflow/tfjs-core';
import {AbstractObjectDetector, DetectorInputRequirement} from '../abstract-object-detector';
import {DetectorResultUtils} from '../utils/detectorresult-utils';
import {TensorUtils} from '../utils/tensor-utils';
import {LogUtils} from '@dps/mycms-commons/dist/commons/utils/log.utils';
import {DetectorUtils} from '../utils/detector-utils';
import {ExtendedImageData} from '../../common/utils/image-utils';

// TODO - migrate faceapi
// import * as faceapi from 'face-api.js';

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
            // TODO - migrate faceapi
            // const localBasePath = (this.getModelBasePath() + '/').replace(/^file:\/\//, '');
            // return faceapi.nets.ssdMobilenetv1.loadFromDisk( localBasePath).then(model => {
            return Promise.reject().then(() => {
                return resolve(true);
            }, reason => {
                console.error('ERROR - initialising ' + this.getDetectorId() + '-detector', reason);
                return reject('ERROR - initialising ' + this.getDetectorId() + '-detector - ' + reason);
            });
        });
    }

    detectFromCommonInput(input: Tensor3D|ExtendedImageData, imageUrl: string): Promise<ObjectDetectionDetectedObject[]> {
        return new Promise<ObjectDetectionDetectedObject[]>((resolve, reject) => {
            let localTensor: Tensor3D = input['width'] ? TensorUtils.imageToTensor3D(<ExtendedImageData>input, TensorUtils.NUMBER_OF_CHANNELS) : undefined;
            let tensor: Tensor3D = input['width'] ? localTensor : <Tensor3D>input;
            // return faceapi.detectAllFaces(tensor).run().then((predictions: FaceDetection[]) => {
            return Promise.reject().then((predictions: any) => {
                const detectedObjects: ObjectDetectionDetectedObject[] = [];
                let detectedObject;
                for (let i = 0; i < predictions.length; i++) {
                    detectedObject = predictions[i];
                    if (detectedObject.class === undefined || detectedObject.class === null || detectedObject.class === '') {
                        console.log('SKIPPED empty detectedObject - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:',
                            imageUrl, detectedObject);
                    }

                    detectedObjects.push(
                        DetectorResultUtils.convertFaceDetectionToObjectDetectionDetectedObject(
                            this, predictions[i], imageUrl, input));
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
