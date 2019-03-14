import {BaseObjectDetectionImageObjectRecord} from '@dps/mycms-commons/dist/search-commons/model/records/baseobjectdetectionimageobject-record';
import * as faceapi from 'face-api.js';
import {FaceDetection} from 'face-api.js';
import {Tensor3D} from '@tensorflow/tfjs';
import {AbstractObjectDetector, DetectorInputRequirement} from '../abstract-object-detector';
import {DetectorResultUtils} from '../utils/detectorresult-utils';
import {TensorUtils} from '../utils/tensor-utils';
import {LogUtils} from "@dps/mycms-commons/dist/commons/utils/log.utils";


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
            faceapi.nets.ssdMobilenetv1.loadFromDisk( localBasePath).then(model => {
                return resolve(true);
            }, reason => {
                console.error('ERROR - initialising ' + this.getDetectorId() + '-detector', reason);
                return reject('ERROR - initialising ' + this.getDetectorId() + '-detector - ' + reason);
            });
        });
    }

    detectFromCommonInput(input: Tensor3D|ImageData, imageUrl: string): Promise<BaseObjectDetectionImageObjectRecord[]> {
        return new Promise<BaseObjectDetectionImageObjectRecord[]>((resolve, reject) => {
            const tensor: Tensor3D =  input['width']
                ? TensorUtils.imageToTensor3D(<ImageData>input, TensorUtils.NUMBER_OF_CHANNELS)
                : <Tensor3D>input;
            faceapi.detectAllFaces(tensor).run().then((predictions: FaceDetection[]) => {
                const detectedObjects: BaseObjectDetectionImageObjectRecord[] = [];
                for (let i = 0; i < predictions.length; i++) {
                    detectedObjects.push(
                        DetectorResultUtils.convertFaceDetectionToBaseObjectDetectionImageObjectRecord(
                            this, predictions[i], imageUrl));
                }

                return resolve(detectedObjects);
            }).catch(error => {
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
