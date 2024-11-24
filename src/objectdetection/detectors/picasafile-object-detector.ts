import {ObjectDetectionDetectedObject} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import {Tensor3D} from '@tensorflow/tfjs-core';
import {AbstractObjectDetector, DetectorInputRequirement} from '../abstract-object-detector';
import {FileUtils} from '../../common/utils/file-utils';
import {TensorUtils} from '../utils/tensor-utils';
import {DetectorResultUtils, PicasaObjectDetectionResult} from '../utils/detectorresult-utils';
import {ExtendedImageData} from '../../common/utils/image-utils';

export class PicasaFileObjectDetector extends AbstractObjectDetector {
    constructor () {
        super();
    }

    getDetectorId(): string {
        return 'picasafile';
    }

    getExpectedInputRequirements(): DetectorInputRequirement {
        return DetectorInputRequirement.IMAGEDIMENSION;
    }

    getModelBaseUrl(): string {
        return undefined;
    }

    getModelAssetsDir(): string {
        return undefined;
    }

    getModelFileNames(): string[] {
        return [];
    }

    initDetector(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            return resolve(true);
        });
    }

    detectFromCommonInput(input: Tensor3D|ExtendedImageData, imageUrl: string): Promise<ObjectDetectionDetectedObject[]> {
        return new Promise<ObjectDetectionDetectedObject[]>((resolve, reject) => {
            // read
            const picasaFile = FileUtils.getDirectoryFromFilePath(imageUrl) + '.picasa.ini';
            const imageFilename = FileUtils.getFilenameFromFilePath(imageUrl);
            let picasaContent: string = undefined;
            try {
                picasaContent = FileUtils.readConcreteFileSync(picasaFile, {encoding: 'UTF-8'});
            } catch (err) {
                // picasa not exists yet
                input = undefined;
                return resolve(undefined);
            }

            // extract imagefiledata
            // [IMG_4343.jpg]
            // faces=rect64(2e1a51885bd6a3d5),c7d67040cc019d70;rect64(9a141facc8097269),df4eef387b4aec87;rect64(5ae248fc8b8ba0c4),40c7d683023c278b
            // backuphash=27571
            let imageFileKey = '[' + imageFilename + ']';
            let startIndexImageFileKey = picasaContent.toLowerCase().indexOf(imageFileKey.toLowerCase());
            if (startIndexImageFileKey < 0) {
                // ImgArea not found in Picasafile
                input = undefined;
                return resolve([]);
            }

            // till next ImgArea or end of file
            let dataImageFile = picasaContent.substring(startIndexImageFileKey + imageFileKey.length);
            let endIndexImageFile = dataImageFile.indexOf('[');
            if (endIndexImageFile < 0) {
                endIndexImageFile = dataImageFile.length;
            }
            dataImageFile = dataImageFile.substring(0, endIndexImageFile);

            // read imagedata
            let imgDim: number[] = TensorUtils.getImageDimensionsFromCommonInput(input);
            let imageWidth = imgDim[0], imageHeight = imgDim[1];

            // extract lines and key-Data
            const detectedObjects: ObjectDetectionDetectedObject[] = [];
            let lines = dataImageFile.split('\n');
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                line = line.replace(/ [\n\r]/g, '');

                for (const type of ['faces']) {
                    // extract typedata
                    let keyData = line.substring(type.length + 1);
                    let keys = keyData.split(';');
                    for (let ii = 0; ii < keys.length; ii++) {
                        let singleKeyData = keys[ii];
                        let match = singleKeyData.match(/rect64\(([A-Za-z0-9]+)\),([A-Za-z0-9]+)/);
                        if (match && match.length > 2) {
                            // check extracted data
                            let rectData = match[1];
                            let objId = match[2];
                            if (!rectData || !objId) {
                                // no rect of objId found
                                continue;
                            }

                            // The number encased in rect64() is a 64-bit hexadecimal number.
                            // Break that up into four 16-bit numbers.
                            let leftHexStr, topHexStr, rightHexStr, bottomHexStr;
                            while (rectData.length < 16) {
                                rectData = '0' + rectData;
                            }

                            if (rectData.length === 16) {
                                // 'big' coordinates
                                leftHexStr = rectData.substring(0, 4);
                                topHexStr = rectData.substring(4, 8);
                                rightHexStr = rectData.substring(8, 12);
                                bottomHexStr = rectData.substring(12, 16);
                            } else {
                                // 'small' coordinates
                                leftHexStr = rectData.substring(0, 2);
                                topHexStr = rectData.substring(2, 4);
                                rightHexStr = rectData.substring(4, 6);
                                bottomHexStr = rectData.substring(6, 8);
                            }

                            //  Divide each by the maximum unsigned 16-bit number (65535) and you'll have four numbers between 0 and 1.
                            //  The four numbers remaining give you relative coordinates for the face rectangle: (left, top, right, bottom).
                            //  If you want to end up with absolute coordinates, multiple the left and right by the image width and the top and bottom by the image height.
                            let left = parseInt(leftHexStr, 16);
                            left = Math.round((left / 65535) * imageWidth);
                            let right = parseInt(rightHexStr, 16);
                            right = Math.round((right / 65535) * imageWidth);
                            let top = parseInt(topHexStr, 16);
                            top = Math.round((top / 65535) * imageHeight);
                            let bottom = parseInt(bottomHexStr, 16);
                            bottom = Math.round((bottom / 65535) * imageHeight);

                            const picasaObject: PicasaObjectDetectionResult = {
                                picasaFileName: picasaFile,
                                imageFileName: imageUrl,
                                key: objId,
                                type: type,
                                rectangle: [left, top, right, bottom],
                                imageDimension: imgDim
                            };
                            detectedObjects.push(
                                DetectorResultUtils.convertPicasaObjectDetectionToObjectDetectionDetectedObject(
                                    this, picasaObject, imageUrl, input))
                        }
                    }
                }
            }

            input = undefined;
            return resolve(detectedObjects);
        });
    }
}
