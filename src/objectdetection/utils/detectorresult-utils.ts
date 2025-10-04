import {ObjectDetectionDetectedObject, ObjectDetectionState} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import {DetectedObject} from '@tensorflow-models/coco-ssd';
import {Pose} from '@tensorflow-models/posenet';
//import {FaceDetection} from 'face-api.js';
import {AbstractObjectDetector} from '../abstract-object-detector';
import {BodyResult, FaceResult, ObjectResult, PersonResult, Result} from '@vladmandic/human';
import {Tensor3D} from '@tensorflow/tfjs-core';
import {ExtendedImageData} from '../../common/utils/image-utils';

export interface MobileNetClass {
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

    public static convertDetectedObjectToObjectDetectionDetectedObject(detector: AbstractObjectDetector,
                                                                       detectedObj: DetectedObject,
                                                                       imageUrl: string, imageDim: number[], id: any,
                                                                       input: Tensor3D|ExtendedImageData): ObjectDetectionDetectedObject {
        if (detectedObj === undefined || detectedObj === null) {
            return undefined;
        }

        return <ObjectDetectionDetectedObject>{
            detector: detector.getDetectorId(),
            key: detectedObj.class || 'Unknown',
            keySuggestion: detectedObj.class || 'Unknown',
            keyCorrection: undefined,
            state: ObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.bbox[0],
            objY: detectedObj.bbox[1],
            objWidth: detectedObj.bbox[2],
            objHeight: detectedObj.bbox[3],
            objType: 'object',
            objId: this.createUUId([imageUrl, detector.getDetectorId(), 'object', id].join('_')),
            objParentId: undefined,
            precision: detectedObj.score,
            imgWidth: imageDim && imageDim.length >= 2 ? imageDim[0] : undefined,
            imgHeight: imageDim && imageDim.length >= 2 ? imageDim[1] : undefined,
            imgOrientation: this.createOrientation(input),
            fileName: imageUrl
        };
    }

    public static convertPoseToObjectDetectionDetectedObject(detector: AbstractObjectDetector,
                                                             detectedObj: Pose,
                                                             imageUrl: string, imageDim: number[], id: any,
                                                             input: Tensor3D|ExtendedImageData): ObjectDetectionDetectedObject {
        if (detectedObj === undefined || detectedObj === null) {
            return undefined;
        }

        return <ObjectDetectionDetectedObject>{
            detector: detector.getDetectorId(),
            key: 'pose',
            keySuggestion: 'pose',
            keyCorrection: undefined,
            state: ObjectDetectionState.RUNNING_SUGGESTED,
            objX: isNaN(detectedObj.keypoints[0].position.x) ? undefined : detectedObj.keypoints[0].position.x,
            objY: isNaN(detectedObj.keypoints[0].position.y) ? undefined : detectedObj.keypoints[0].position.y,
            objWidth: isNaN(detectedObj.keypoints[0].position.x) ? undefined : 1,
            objHeight: isNaN(detectedObj.keypoints[0].position.y) ? undefined : 1,
            objType: 'object',
            objId: this.createUUId([imageUrl, detector.getDetectorId(), 'object', id].join('_')),
            objParentId: undefined,
            objDetails: JSON.stringify(detectedObj.keypoints),
            precision: isNaN(detectedObj.score) ? undefined : detectedObj.score,
            imgWidth: imageDim && imageDim.length >= 2 ? imageDim[0] : undefined,
            imgHeight: imageDim && imageDim.length >= 2 ? imageDim[1] : undefined,
            imgOrientation: this.createOrientation(input),
            fileName: imageUrl
        };
    }

    public static convertMobileNetClassToObjectDetectionDetectedObject(detector: AbstractObjectDetector,
                                                                       detectedObj: MobileNetClass,
                                                                       imageUrl: string, imageDim: number[], id: any,
                                                                       input: Tensor3D|ExtendedImageData): ObjectDetectionDetectedObject {
        if (detectedObj === undefined || detectedObj === null) {
            return undefined;
        }

        return <ObjectDetectionDetectedObject>{
            detector: detector.getDetectorId(),
            key: detectedObj.className || 'Unknown',
            keySuggestion: detectedObj.className || 'Unknown',
            keyCorrection: undefined,
            state: ObjectDetectionState.RUNNING_SUGGESTED,
            objX: 0,
            objY: 0,
            objWidth: 1,
            objHeight: 1,
            objType: 'object',
            objId: this.createUUId([imageUrl, detector.getDetectorId(), 'object', id].join('_')),
            objParentId: undefined,
            precision: detectedObj.probability,
            imgWidth: imageDim && imageDim.length >= 2 ? imageDim[0] : undefined,
            imgHeight: imageDim && imageDim.length >= 2 ? imageDim[1] : undefined,
            imgOrientation: this.createOrientation(input),
            fileName: imageUrl
        };
    }

    public static convertFaceDetectionToObjectDetectionDetectedObject(detector: AbstractObjectDetector,
                                                                      // TODO - migrate faceapi
                                                                      //       detectedObj: FaceDetection,
                                                                      detectedObj: any,
                                                                      imageUrl: string,
                                                                      input: Tensor3D|ExtendedImageData): ObjectDetectionDetectedObject {
        if (detectedObj === undefined || detectedObj === null) {
            return undefined;
        }

        return <ObjectDetectionDetectedObject>{
            detector: detector.getDetectorId(),
            key: detectedObj.className || 'CommonFace',
            keySuggestion: detectedObj.className || 'CommonFace',
            keyCorrection: undefined,
            state: ObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.box.left,
            objY: detectedObj.box.top,
            objWidth: detectedObj.box.width,
            objHeight: detectedObj.box.height,
            objType: 'object',
            objId: this.createUUId([imageUrl, detector.getDetectorId(), 'object', detectedObj.id].join('_')),
            objParentId: undefined,
            precision: detectedObj.classScore,
            imgWidth: detectedObj.imageWidth,
            imgHeight: detectedObj.imageHeight,
            imgOrientation: this.createOrientation(input),
            fileName: imageUrl
        };
    }

    public static convertHumanFaceDetectionToObjectDetectionDetectedObject(detector: AbstractObjectDetector,
                                                                           result: Result,
                                                                           detectedObj: FaceResult,
                                                                           imageUrl: string,
                                                                           parentId: string,
                                                                           input: Tensor3D|ExtendedImageData): ObjectDetectionDetectedObject[] {
        const faceresults: ObjectDetectionDetectedObject[] = [];
        if (detectedObj === undefined || detectedObj === null) {
            return faceresults;
        }

        const faceId = this.createUUId([imageUrl, detector.getDetectorId(), 'face', detectedObj.id].join('_'));
        faceresults.push(<ObjectDetectionDetectedObject>{
            detector: detector.getDetectorId(),
            key: 'CommonFace',
            keySuggestion: 'CommonFace',
            keyCorrection: undefined,
            state: ObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.box[0],
            objY:  detectedObj.box[1],
            objWidth:  detectedObj.box[2],
            objHeight:  detectedObj.box[3],
            precision: detectedObj.boxScore,
            objType: 'face',
            objId: faceId,
            objParentId: parentId,
            objDescriptor: detectedObj.embedding ? detectedObj.embedding.toString() : undefined,
            objDetails: detectedObj.annotations ? JSON.stringify(detectedObj.annotations): undefined,
            imgWidth: result.width,
            imgHeight: result.height,
            imgOrientation: this.createOrientation(input),
            fileName: imageUrl
        });

        if (detectedObj.age) {
            faceresults.push(<ObjectDetectionDetectedObject>{
                detector: detector.getDetectorId(),
                key: 'face_age_' + Math.round(detectedObj.age),
                keySuggestion: 'face_age_' + Math.round(detectedObj.age),
                keyCorrection: undefined,
                state: ObjectDetectionState.RUNNING_SUGGESTED,
                objX: detectedObj.box[0],
                objY: detectedObj.box[1],
                objWidth: detectedObj.box[2],
                objHeight: detectedObj.box[3],
                objType: 'face_age',
                objId: this.createUUId([imageUrl, detector.getDetectorId(), 'face_age', detectedObj.id].join('_')),
                objParentId: faceId,
                precision: detectedObj.score,
                imgWidth: result.width,
                imgHeight: result.height,
                imgOrientation: this.createOrientation(input),
                fileName: imageUrl
            });
        }

        if (detectedObj.emotion && detectedObj.emotion.length > 0) {
            const emotion = detectedObj.emotion[0];
            faceresults.push(<ObjectDetectionDetectedObject>{
                detector: detector.getDetectorId(),
                key: 'face_emotion_' + emotion.emotion,
                keySuggestion: 'face_emotion_' + emotion.emotion,
                keyCorrection: undefined,
                state: ObjectDetectionState.RUNNING_SUGGESTED,
                objX: detectedObj.box[0],
                objY: detectedObj.box[1],
                objWidth: detectedObj.box[2],
                objHeight: detectedObj.box[3],
                objType: 'face_emotion',
                objId: this.createUUId([imageUrl, detector.getDetectorId(), 'face_emotion', detectedObj.id].join('_')),
                objParentId: faceId,
                precision: emotion.score,
                imgWidth: result.width,
                imgHeight: result.height,
                imgOrientation: this.createOrientation(input),
                fileName: imageUrl
            });
        }

        if (detectedObj.race && detectedObj.race.length > 0) {
            const race = detectedObj.race[0];
            faceresults.push(<ObjectDetectionDetectedObject>{
                detector: detector.getDetectorId(),
                key: 'face_race_' + race.race,
                keySuggestion: 'face_race_' + race.race,
                keyCorrection: undefined,
                state: ObjectDetectionState.RUNNING_SUGGESTED,
                objX: detectedObj.box[0],
                objY: detectedObj.box[1],
                objWidth: detectedObj.box[2],
                objHeight: detectedObj.box[3],
                objType: 'face_race',
                objId: this.createUUId([imageUrl, detector.getDetectorId(), 'face_race', detectedObj.id].join('_')),
                objParentId: faceId,
                precision: race.score,
                imgWidth: result.width,
                imgHeight: result.height,
                imgOrientation: this.createOrientation(input),
                fileName: imageUrl
            });
        }

        if (detectedObj.gender && detectedObj.gender !== 'unknown') {
            faceresults.push(<ObjectDetectionDetectedObject>{
                detector: detector.getDetectorId(),
                key: 'face_gender_' + detectedObj.gender,
                keySuggestion: 'face_gender_' + detectedObj.gender,
                keyCorrection: undefined,
                state: ObjectDetectionState.RUNNING_SUGGESTED,
                objX: detectedObj.box[0],
                objY: detectedObj.box[1],
                objWidth: detectedObj.box[2],
                objHeight: detectedObj.box[3],
                objType: 'face_gender',
                objId: this.createUUId([imageUrl, detector.getDetectorId(), 'face_gender', detectedObj.id].join('_')),
                objParentId: faceId,
                precision: detectedObj.genderScore,
                imgWidth: result.width,
                imgHeight: result.height,
                imgOrientation: this.createOrientation(input),
                fileName: imageUrl
            });
        }

        return faceresults;
    }

    public static convertHumanObjectDetectionToObjectDetectionDetectedObject(detector: AbstractObjectDetector,
                                                                             result: Result,
                                                                             detectedObj: ObjectResult,
                                                                             imageUrl: string,
                                                                             input: Tensor3D|ExtendedImageData): ObjectDetectionDetectedObject[] {
        const faceresults: ObjectDetectionDetectedObject[] = [];
        if (detectedObj === undefined || detectedObj === null) {
            return faceresults;
        }

        const objectId = this.createUUId([imageUrl, detector.getDetectorId(), 'object', detectedObj.id].join('_'));
        faceresults.push(<ObjectDetectionDetectedObject>{
            detector: detector.getDetectorId(),
            key: 'object_' + detectedObj.label,
            keySuggestion: 'object_' + detectedObj.label,
            keyCorrection: undefined,
            state: ObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.box[0],
            objY: detectedObj.box[1],
            objWidth: detectedObj.box[2],
            objHeight: detectedObj.box[3],
            objType: 'object',
            objId: objectId,
            objParentId: undefined,
            precision: detectedObj.score,
            imgWidth: result.width,
            imgHeight: result.height,
            imgOrientation: this.createOrientation(input),
            fileName: imageUrl
        });

        if (detectedObj.class) {
            faceresults.push(<ObjectDetectionDetectedObject>{
                detector: detector.getDetectorId(),
                key: 'objectclassid_' + detectedObj.class,
                keySuggestion: 'objectclassid_' + detectedObj.class,
                keyCorrection: undefined,
                state: ObjectDetectionState.RUNNING_SUGGESTED,
                objX: detectedObj.box[0],
                objY: detectedObj.box[1],
                objWidth: detectedObj.box[2],
                objHeight: detectedObj.box[3],
                objType: 'objectclassid',
                objId: this.createUUId([imageUrl, detector.getDetectorId(), 'objectclassid', detectedObj.id].join('_')),
                objParentId: objectId,
                precision: detectedObj.score,
                imgWidth: result.width,
                imgHeight: result.height,
                imgOrientation: this.createOrientation(input),
                fileName: imageUrl
            });
        }

        return faceresults;
    }

    public static convertHumanBodyDetectionToObjectDetectionDetectedObject(detector: AbstractObjectDetector,
                                                                           result: Result,
                                                                           detectedObj: BodyResult,
                                                                           imageUrl: string, parentId: string,
                                                                           input: Tensor3D|ExtendedImageData): ObjectDetectionDetectedObject[] {
        const bodyresults: ObjectDetectionDetectedObject[] = [];
        if (detectedObj === undefined || detectedObj === null
            || ! (detectedObj.score > 0)) {
            return bodyresults;
        }

        bodyresults.push(<ObjectDetectionDetectedObject>{
            detector: detector.getDetectorId(),
            key: 'body',
            keySuggestion: 'body',
            keyCorrection: undefined,
            state: ObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.box[0],
            objY: detectedObj.box[1],
            objWidth: detectedObj.box[2],
            objHeight: detectedObj.box[3],
            objType: 'body',
            objId: this.createUUId([imageUrl, detector.getDetectorId(), 'body', detectedObj.id].join('_')),
            objParentId: parentId,
            objDescriptor: undefined,
            objDetails: detectedObj.annotations ? JSON.stringify(detectedObj.annotations) : undefined,
            precision: detectedObj.score,
            imgWidth: result.width,
            imgHeight: result.height,
            imgOrientation: this.createOrientation(input),
            fileName: imageUrl
        });

        return bodyresults;
    }

    public static convertHumanPersonDetectionToObjectDetectionDetectedObject(detector: AbstractObjectDetector,
                                                                             result: Result,
                                                                             detectedObj: PersonResult,
                                                                             imageUrl: string,
                                                                             input: Tensor3D|ExtendedImageData): ObjectDetectionDetectedObject[] {
        const faceresults: ObjectDetectionDetectedObject[] = [];
        if (detectedObj === undefined || detectedObj === null) {
            return faceresults;
        }

        const personId = this.createUUId([imageUrl, detector.getDetectorId(), 'fullperson', detectedObj.id].join('_'));
        const precisions = [];
        if (detectedObj.face) {
            faceresults.push(
                ...DetectorResultUtils.convertHumanFaceDetectionToObjectDetectionDetectedObject(
                    detector, result, detectedObj.face, imageUrl, personId, input));
            precisions.push(detectedObj.face.faceScore);
        }

        if (detectedObj.body) {
            faceresults.push(...
                DetectorResultUtils.convertHumanBodyDetectionToObjectDetectionDetectedObject(
                    detector, result, detectedObj.body, imageUrl, personId, input))
            precisions.push(detectedObj.body.score);
        }

        let maxPrecision : number = 0;
        precisions.forEach(
            precision => maxPrecision = precision > maxPrecision
                ? precision
                : maxPrecision);

        return [<ObjectDetectionDetectedObject>{
            detector: detector.getDetectorId(),
            key: 'fullperson',
            keySuggestion: 'fullperson',
            keyCorrection: undefined,
            state: ObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.box[0],
            objY: detectedObj.box[1],
            objWidth: detectedObj.box[2],
            objHeight: detectedObj.box[3],
            objType: 'fullperson',
            objId: personId,
            objParentId: undefined,
            precision: maxPrecision,
            imgWidth: result.width,
            imgHeight: result.height,
            imgOrientation: this.createOrientation(input),
            fileName: imageUrl
        }].concat(faceresults);
    }

    public static convertPicasaObjectDetectionToObjectDetectionDetectedObject(detector: AbstractObjectDetector,
                                                                              detectedObj: PicasaObjectDetectionResult,
                                                                              imageUrl: string,
                                                                              input: Tensor3D|ExtendedImageData): ObjectDetectionDetectedObject {
        if (detectedObj === undefined || detectedObj === null) {
            return undefined;
        }

        return <ObjectDetectionDetectedObject>{
            detector: detector.getDetectorId(),
            key: (detectedObj.type + '_' + detectedObj.key) || 'CommonFace',
            keySuggestion: (detectedObj.type + '_' + detectedObj.key) || 'CommonFace',
            keyCorrection: undefined,
            state: ObjectDetectionState.RUNNING_SUGGESTED,
            objX: detectedObj.rectangle[0],
            objY: detectedObj.rectangle[1],
            objWidth: detectedObj.rectangle[2] - detectedObj.rectangle[0],
            objHeight: detectedObj.rectangle[3] - detectedObj.rectangle[1],
            precision: 1,
            imgWidth: detectedObj.imageDimension[0],
            imgHeight: detectedObj.imageDimension[1],
            imgOrientation: this.createOrientation(input),
            fileName: imageUrl
        };
    }

    public static createUUId(source: string): string {
        return source.replace(/[^A-Za-z0-9_]/g, '');
    }

    public static createOrientation(input: Tensor3D|ExtendedImageData): string {
        return input['orientation'];
    }
}
