import {Tensor3D} from '@tensorflow/tfjs-core';
import {ExtendedImageData, ImageUtils} from '../../common/utils/image-utils';
import {FileUtils} from '../../common/utils/file-utils';

const tf = global['TFJS_LOADER'] != undefined ? global['TFJS_LOADER']() : require('@tensorflow/tfjs');
tf.disableDeprecationWarnings();

export class TensorUtils {
    public static NUMBER_OF_CHANNELS = 3;

    public static readImageFromFile(imageFile: string): Promise<ExtendedImageData> {
        return new Promise<ExtendedImageData>((resolve, reject) => {
            let buffer;
            try {
                buffer = FileUtils.readConcreteFileSync(imageFile);
                const imageData = ImageUtils.readImageDataFromBuffer(buffer);
                if (imageData.orientation) {
                    buffer = undefined;
                    return resolve(imageData);
                }

                return ImageUtils.readExifForImage(buffer).then(exif => {
                    buffer = undefined;
                    imageData.orientation = exif['image']
                        ? exif['image']['Orientation']
                        : undefined;
                    return resolve(imageData);
                }).catch(error => {
                    console.log('SKIPPING - error while reading exifdata of image', imageFile, error);
                    buffer = undefined;
                    return resolve(imageData);
                });
            } catch (error) {
                buffer = undefined;
                return reject(error);
            }
        });
    }

    public static readImageFromUrl(imageFile: string): Promise<ExtendedImageData> {
        return fetch(imageFile).then(response => {
            return response.arrayBuffer()
        }).then((ret) => {
            let buffer: Buffer = Buffer.from(ret);
            const imageData = ImageUtils.readImageDataFromBuffer(buffer);
            if (imageData.orientation) {
                buffer = undefined;
                return Promise.resolve(imageData);
            }

            return ImageUtils.readExifForImage(buffer).then(exif => {
                buffer = undefined;
                imageData.orientation = exif['image']
                    ? exif['image']['Orientation']
                    : undefined;
                return Promise.resolve(imageData);
            }).catch(error => {
                buffer = undefined;
                console.log('SKIPPING - error while reading exifdata of image', imageFile, error);
                return Promise.resolve(imageData);
            });
        }).catch(reason => {
            return Promise.reject(reason);
        });
    }

    public static readImageFromLocation(imageUrl: string): Promise<ExtendedImageData> {
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return TensorUtils.readImageFromUrl(imageUrl);
        } else {
            return TensorUtils.readImageFromFile(imageUrl);
        }
    }

    public static readImageMetaDataFromFile(imageFile: string): Promise<ExtendedImageData> {
        const buffer = FileUtils.readConcreteFileSync(imageFile);
        return ImageUtils.readImageMetaDataFromBuffer(buffer);
    }

    public static readImageMetaDataFromUrl(imageFile: string): Promise<ExtendedImageData> {
        return fetch(imageFile).then(response => {
            return response.arrayBuffer()
        }).then((ret) => {
            let buffer: Buffer = Buffer.from(ret);
            return ImageUtils.readImageMetaDataFromBuffer(buffer);
        }).catch(reason => {
            return Promise.reject(reason);
        });
    }

    public static readImageMetaDataFromLocation(imageUrl: string): Promise<ExtendedImageData> {
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return TensorUtils.readImageMetaDataFromUrl(imageUrl);
        } else {
            return TensorUtils.readImageMetaDataFromFile(imageUrl);
        }
    }

    public static readImageTensorFromFile(imageFile: string): Promise<Tensor3D> {
        return new Promise<Tensor3D>((resolve, reject) => {
            this.readImageFromFile(imageFile).then(imageData => {
                return resolve(TensorUtils.imageToTensor3D(imageData, this.NUMBER_OF_CHANNELS));
            }).catch(reason => {
                return reject(reason);
            })
        });
    }

    public static readImageTensorFromUrl(imageFile: string): Promise<Tensor3D> {
        return new Promise<Tensor3D>((resolve, reject) => {
            this.readImageFromUrl(imageFile).then(imageData => {
                return resolve(TensorUtils.imageToTensor3D(imageData, this.NUMBER_OF_CHANNELS));
            }).catch(reason => {
                return reject(reason);
            });
        });
    }

    public static readImageTensorFromLocation(imageUrl: string): Promise<Tensor3D> {
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return TensorUtils.readImageTensorFromUrl(imageUrl);
        } else {
            return TensorUtils.readImageTensorFromFile(imageUrl);
        }
    }

    public static imageToTensor3D(image: ExtendedImageData, numChannels: number): Tensor3D {
        const start = new Date();
        const values = ImageUtils.imageToInt32Array(image, numChannels);
        const outShape: [number, number, number] = [image.height, image.width, numChannels];
        const ret = tf.tensor3d(values, outShape, 'int32');
        // console.debug('duration creating tensor3d:', new Date().getTime() - start.getTime());
        if (ret['orientation'] === undefined) {
            ret['orientation'] = image['orientation'];
        }

        return ret;
    }

    public static getImageDimensionsFromTensor3D(tensor: Tensor3D): number[] {
        return [tensor.shape[1], tensor.shape[0]];
    }

    public static getImageDimensionsFromCommonInput(input: Tensor3D|ExtendedImageData): number[] {
        return (input['width'] !== undefined
            ? [(<ExtendedImageData>input).width, (<ExtendedImageData>input).height]
            : TensorUtils.getImageDimensionsFromTensor3D(<Tensor3D>input));
    }
}
