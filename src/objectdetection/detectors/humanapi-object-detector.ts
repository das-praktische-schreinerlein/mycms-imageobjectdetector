import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import {Config, Human} from '@vladmandic/human';
import {Tensor3D} from '@tensorflow/tfjs-core';
import {AbstractObjectDetector, DetectorInputRequirement} from '../abstract-object-detector';
import {DetectorResultUtils} from '../utils/detectorresult-utils';
import {TensorUtils} from '../utils/tensor-utils';
import {LogUtils} from '@dps/mycms-commons/dist/commons/utils/log.utils';
import {DetectorUtils} from '../utils/detector-utils';
import * as tf from '@tensorflow/tfjs-node';


export class HumanApiObjectDetector extends AbstractObjectDetector {
    private detector: Human;
    private BASEURL = 'https://raw.githubusercontent.com/vladmandic/human/refs/heads/main/';
    private assetsDir = 'assets/models/humanapi/';
    private readonly rootDir: string;

    constructor (rootDir: string) {
        super();
        this.rootDir = rootDir;
    }

    getDetectorId(): string {
        return 'humanapi';
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
        return [this.getModelDirectoryName() + 'antispoof.json',
            this.getModelDirectoryName() + 'blazeface.bin',
            this.getModelDirectoryName() + 'blazeface.json',
            this.getModelDirectoryName() + 'centernet.bin',
            this.getModelDirectoryName() + 'centernet.json',
            this.getModelDirectoryName() + 'emotion.bin',
            this.getModelDirectoryName() + 'emotion.json',
            this.getModelDirectoryName() + 'facemesh.bin',
            this.getModelDirectoryName() + 'facemesh.json',
            this.getModelDirectoryName() + 'faceres.bin',
            this.getModelDirectoryName() + 'faceres.json',
            this.getModelDirectoryName() + 'handlandmark-lite.bin',
            this.getModelDirectoryName() + 'handlandmark-lite.json',
            this.getModelDirectoryName() + 'handtrack.bin',
            this.getModelDirectoryName() + 'handtrack.json',
            this.getModelDirectoryName() + 'iris.bin',
            this.getModelDirectoryName() + 'iris.json',
            this.getModelDirectoryName() + 'liveness.bin',
            this.getModelDirectoryName() + 'liveness.json',
            this.getModelDirectoryName() + 'models.json',
            this.getModelDirectoryName() + 'movenet-lightning.bin',
            this.getModelDirectoryName() + 'movenet-lightning.json'];
    }

    initDetector(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const config: Partial<Config>  = { // just enable all and leave default settings
                modelBasePath: this.getModelBasePath() + '/' + this.getModelDirectoryName(),
                debug: true,
                softwareKernels: true, // slower but enhanced precision since face rotation can work in software mode in nodejs environments
                cacheSensitivity: 0,
                backend: 'tensorflow',
                async: false,
                filter: {
                    enabled: true,
                    flip: true,
                },
                gesture: {
                    enabled: true,
                },
                face: {
                    detector: {
                        maxDetected: 20
                    },
                    mesh: {
                        enabled: true
                    },
                    attention: {
                        enabled: true
                    },
                    iris: {
                        enabled: true
                    },
                    emotion: {
                        enabled: true
                    },
                    description: {
                        enabled: true
                    },
                    antispoof: {
                        enabled: true
                    },
                    liveness: {
                        enabled: true
                    }
                },
                body: {
                    enabled: true
                },
                hand: {
                    enabled: true,
                },
                // body: { modelPath: 'blazepose.json', enabled: true },
                object: {
                    enabled: true
                },
                segmentation: {
                    enabled: true
                }
            };

            this.detector = new Human(config);
            return this.detector.tf.ready().then(() => {
                console.log('Human:', this.detector.version, 'TF:', tf.version_core);
                return this.detector.load();
            }).then(() => {
                console.log('Loaded:', this.detector.models.loaded());
                console.log('Memory state:',this.detector.tf.engine().memory());
                return resolve(true);
            }).catch(reason => {
                console.error('ERROR - initialising ' + this.getDetectorId() + '-detector', reason);
                return reject('ERROR - initialising ' + this.getDetectorId() + '-detector - ' + reason);
            });
        });
    }

    detectFromCommonInput(input: Tensor3D|ImageData, imageUrl: string): Promise<ObjectDetectionDetectedObject[]> {
        return new Promise<ObjectDetectionDetectedObject[]>((resolve, reject) => {
            let localTensor: Tensor3D = input['width']
                ? TensorUtils.imageToTensor3D(<ImageData>input, TensorUtils.NUMBER_OF_CHANNELS)
                : undefined;
            let tensor = input['width']
                ? localTensor
                : <Tensor3D>input;

            return this.detector.detect(<ImageData>input).then(result => {
                const error = result === undefined
                    ? 'no result'
                    : result.error;
                if (error) {
                    console.error('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + LogUtils.sanitizeLogMsg(imageUrl), error);
                    this.detector.tf.dispose(tensor);
                    localTensor = DetectorUtils.disposeObj(localTensor);
                    input = undefined;
                    tensor = undefined;
                    return reject('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + imageUrl + ' - ' + result.error);
                }

                const detectedObjects: ObjectDetectionDetectedObject[] = [];
                for (let i = 0; i < result.face.length; i++) {
                    const mappedResults: ObjectDetectionDetectedObject[] =
                        DetectorResultUtils.convertHumanFaceDetectionToObjectDetectionDetectedObject(this, result, result.face[i], imageUrl);
                    for (let j = 0; j < mappedResults.length; j++) {
                        detectedObjects.push(mappedResults[j]);
                    }
                }

                for (let i = 0; i < result.object.length; i++) {
                    const mappedResults: ObjectDetectionDetectedObject[] =
                        DetectorResultUtils.convertHumanObjectDetectionToObjectDetectionDetectedObject(this, result, result.object[i], imageUrl);
                    for (let j = 0; j < mappedResults.length; j++) {
                        detectedObjects.push(mappedResults[j]);
                    }
                }

                for (let i = 0; i < result.body.length; i++) {
                    const mappedResults: ObjectDetectionDetectedObject[] =
                        DetectorResultUtils.convertHumanBodyDetectionToObjectDetectionDetectedObject(this, result, result.body[i], imageUrl);
                    for (let j = 0; j < mappedResults.length; j++) {
                        detectedObjects.push(mappedResults[j]);
                    }
                }

                for (let i = 0; i < result.persons.length; i++) {
                    const mappedResults: ObjectDetectionDetectedObject[] =
                        DetectorResultUtils.convertHumanPersonDetectionToObjectDetectionDetectedObject(this, result, result.persons[i], imageUrl);
                    for (let j = 0; j < mappedResults.length; j++) {
                        detectedObjects.push(mappedResults[j]);
                    }
                }

                this.detector.tf.dispose(tensor);
                localTensor = DetectorUtils.disposeObj(localTensor);
                input = undefined;
                tensor = undefined;
                return resolve(detectedObjects);
            }).catch (error => {
                console.log('blubsibum', error);
                console.error('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + LogUtils.sanitizeLogMsg(imageUrl), error);
                this.detector.tf.dispose(tensor);
                localTensor = DetectorUtils.disposeObj(localTensor);
                input = undefined;
                tensor = undefined;
                reject('ERROR - detecting objects with ' + this.getDetectorId() + ' on tensor from imageUrl:' + imageUrl + ' - ' + error);
                return;
            });
        });
    }

    protected getModelDirectoryName(): string {
        return 'models/';
    }

    protected getModelBasePath(): string {
        return this.rootDir + this.assetsDir;
    }

}
