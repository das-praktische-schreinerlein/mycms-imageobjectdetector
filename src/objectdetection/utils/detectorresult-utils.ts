import {
    BaseObjectDetectionImageObjectRecord,
    BaseObjectDetectionState
} from '@dps/mycms-commons/dist/search-commons/model/records/baseobjectdetectionimageobject-record';
import {DetectedObject} from '@tensorflow-models/coco-ssd';
import {Pose} from '@tensorflow-models/posenet';
import {FaceDetection} from 'face-api.js';
import {AbstractObjectDetector} from '../abstract-object-detector';

export interface mobileNetClass {
    className: string;
    probability: number;
}

export interface PicasaObjectDetectionResult {
    type: string;
    key: string;
    picasaFileName: string;
    imageFileName: string;
    rectangle: number[];
    imageDimension: number[];
}

export class DetectorResultUtils {

    public static convertDetectedObjectToBaseObjectDetectionImageObjectRecord(detector: AbstractObjectDetector,
                                                                              detectedObj: DetectedObject,
                                                                              imageUrl: string, imageDim: number[]): BaseObjectDetectionImageObjectRecord {
        return new BaseObjectDetectionImageObjectRecord({
            detector: detector.getDetectorId(),
            key: detectedObj.class || 'Unknown',
            keySuggestion: detectedObj.class || 'Unknown',
            keyCorrection: undefined,
            state: BaseObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.bbox[0],
            objY: detectedObj.bbox[1],
            objWidth: detectedObj.bbox[2],
            objHeight: detectedObj.bbox[3],
            precision: detectedObj.score,
            imgWidth: imageDim && imageDim.length >= 2 ? imageDim[0] : undefined,
            imgHeight: imageDim && imageDim.length >= 2 ? imageDim[1] : undefined,
            descHtml: undefined,
            descMd: undefined,
            descTxt: undefined,
            fileName: imageUrl,
            id: undefined,
            name: detectedObj.class || 'Unknown'
        });
    }

    public static convertPoseToBaseObjectDetectionImageObjectRecord(detector: AbstractObjectDetector,
                                                                    detectedObj: Pose,
                                                                    imageUrl: string, imageDim: number[]): BaseObjectDetectionImageObjectRecord {
        return new BaseObjectDetectionImageObjectRecord({
            detector: detector.getDetectorId(),
            key: 'pose',
            keySuggestion: 'pose',
            keyCorrection: undefined,
            state: BaseObjectDetectionState.RUNNING_SUGGESTED,
            objX: isNaN(detectedObj.keypoints[0].position.x) ? undefined : detectedObj.keypoints[0].position.x,
            objY: isNaN(detectedObj.keypoints[0].position.y) ? undefined : detectedObj.keypoints[0].position.y,
            objWidth: isNaN(detectedObj.keypoints[0].position.x) ? undefined : 1,
            objHeight: isNaN(detectedObj.keypoints[0].position.y) ? undefined : 1,
            precision: isNaN(detectedObj.score) ? undefined : detectedObj.score,
            imgWidth: imageDim && imageDim.length >= 2 ? imageDim[0] : undefined,
            imgHeight: imageDim && imageDim.length >= 2 ? imageDim[1] : undefined,
            descHtml: undefined,
            descMd: undefined,
            descTxt: undefined,
            fileName: imageUrl,
            id: undefined,
            name: 'pose'
        });
    }

    public static convertMobileNetClassToBaseObjectDetectionImageObjectRecord(detector: AbstractObjectDetector,
                                                                              detectedObj: mobileNetClass,
                                                                              imageUrl: string, imageDim: number[]): BaseObjectDetectionImageObjectRecord {
        return new BaseObjectDetectionImageObjectRecord({
            detector: detector.getDetectorId(),
            key: detectedObj.className || 'Unknown',
            keySuggestion: detectedObj.className || 'Unknown',
            keyCorrection: undefined,
            state: BaseObjectDetectionState.RUNNING_SUGGESTED,
            objX: 0,
            objY: 0,
            objWidth: 1,
            objHeight: 1,
            precision: detectedObj.probability,
            imgWidth: imageDim && imageDim.length >= 2 ? imageDim[0] : undefined,
            imgHeight: imageDim && imageDim.length >= 2 ? imageDim[1] : undefined,
            descHtml: undefined,
            descMd: undefined,
            descTxt: undefined,
            fileName: imageUrl,
            id: undefined,
            name: detectedObj.className || 'Unknown'
        });
    }

    public static convertFaceDetectionToBaseObjectDetectionImageObjectRecord(detector: AbstractObjectDetector,
                                                                             detectedObj: FaceDetection,
                                                                             imageUrl: string): BaseObjectDetectionImageObjectRecord {
        return new BaseObjectDetectionImageObjectRecord({
            detector: detector.getDetectorId(),
            key: detectedObj.className || 'CommonFace',
            keySuggestion: detectedObj.className || 'CommonFace',
            keyCorrection: undefined,
            state: BaseObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.box.left,
            objY: detectedObj.box.top,
            objWidth: detectedObj.box.width,
            objHeight: detectedObj.box.height,
            precision: detectedObj.classScore,
            imgWidth: detectedObj.imageWidth,
            imgHeight: detectedObj.imageHeight,
            descHtml: undefined,
            descMd: undefined,
            descTxt: undefined,
            fileName: imageUrl,
            id: undefined,
            name: detectedObj.className || 'CommonFace'
        });
    }

    public static convertPicasaObjectDetectionToBaseObjectDetectionImageObjectRecord(detector: AbstractObjectDetector,
                                                                             detectedObj: PicasaObjectDetectionResult,
                                                                             imageUrl: string): BaseObjectDetectionImageObjectRecord {
        return new BaseObjectDetectionImageObjectRecord({
            detector: detector.getDetectorId(),
            key: (detectedObj.type + '_' + detectedObj.key) || 'CommonFace',
            keySuggestion: (detectedObj.type + '_' + detectedObj.key) || 'CommonFace',
            keyCorrection: undefined,
            state: BaseObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.rectangle[0],
            objY: detectedObj.rectangle[1],
            objWidth: detectedObj.rectangle[2] - detectedObj.rectangle[0],
            objHeight: detectedObj.rectangle[3] - detectedObj.rectangle[1],
            precision: 1,
            imgWidth: detectedObj.imageDimension[0],
            imgHeight: detectedObj.imageDimension[1],
            descHtml: undefined,
            descMd: undefined,
            descTxt: undefined,
            fileName: imageUrl,
            id: undefined,
            name: (detectedObj.type + '_' + detectedObj.key) || 'CommonFace'
        });
    }

}