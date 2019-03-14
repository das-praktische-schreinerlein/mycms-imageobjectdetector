import {AbstractObjectDetector} from '../abstract-object-detector';
import {TFJsCocossdObjectDetector} from '../detectors/tfjs-cocossd-object-detector';
import {TFJsMobilenetObjectDetector} from '../detectors/tfjs-mobilenet-object-detector';
import {TFJsPosenetObjectDetector} from '../detectors/tfjs-posenet-object-detector';
import {FaceApiObjectDetector} from '../detectors/faceapi-object-detector';
import {PicasaFileObjectDetector} from '../detectors/picasafile-object-detector';

export class DetectorFactory {
    public static createDetectors(detectorIds: string, rootDir: string): AbstractObjectDetector[] {
        let detectors: AbstractObjectDetector[] = [];
        const detectorString = detectorIds || '';
        for (const detectorName of detectorString.split(',')) {
            switch (detectorName) {
                case 'tfjs_cocossd_mobilenet_v1':
                    detectors.push(new TFJsCocossdObjectDetector(rootDir, 'mobilenet_v1'));
                    break;
                case 'tfjs_cocossd_mobilenet_v2':
                    detectors.push(new TFJsCocossdObjectDetector(rootDir, 'mobilenet_v2'));
                    break;
                case 'tfjs_cocossd_lite_mobilenet_v2':
                    detectors.push(new TFJsCocossdObjectDetector(rootDir, 'lite_mobilenet_v2'));
                    break;
                case 'tfjs_mobilenet_v1':
                    detectors.push(new TFJsMobilenetObjectDetector(rootDir));
                    break;
                case 'tfjs_posenet':
                    detectors.push(new TFJsPosenetObjectDetector(rootDir));
                    break;
                case 'faceapi':
                    detectors.push(new FaceApiObjectDetector(rootDir));
                    break;
                case 'picasafile':
                    detectors.push(new PicasaFileObjectDetector());
                    break;
                default:
                    throw new Error('unknown detector:' + detectorName);
            }
        }

        return detectors;
    };

    public static getAvailableDetectorMessage(): string {
        return 'invalid detectors: use \'tfjs_cocossd_mobilenet_v1,tfjs_cocossd_mobilenet_v2,tfjs_cocossd_lite_mobilenet_v2,tfjs_mobilenet_v1,tfjs_posenet,faceapi\'\n' +
            '-- attention: tfjs_posenet is very slow\n' +
            '-- attention: faceapi got sometimes exception\n'
    }
}
