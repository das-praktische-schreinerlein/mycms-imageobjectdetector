import * as tf from '@tensorflow/tfjs-node';
import {Tensor3D} from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import {ImageUtils} from '../../common/utils/image-utils';

export class TensorUtils {
    public static NUMBER_OF_CHANNELS = 3;

    public static readImageFromFile(imageFile): Promise<ImageData> {
        const buffer = fs.readFileSync(imageFile);
        const imageData = ImageUtils.readImageDataFromBuffer(buffer);
        return new Promise<ImageData>(resolve => {
            return resolve(imageData);
        });
    }

    public static readImageFromUrl(imageFile): Promise<ImageData> {
        return new Promise<ImageData>((resolve, reject) => {
            fetch(imageFile).then(response => {
                const imageData = ImageUtils.readImageDataFromBuffer(response.body);
                return resolve(imageData);
            }).catch(reason => {
                return reject(reason);
            });
        });
    }

    public static readImageFromLocation(imageUrl: string): Promise<ImageData> {
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return TensorUtils.readImageFromUrl(imageUrl);
        } else {
            return TensorUtils.readImageFromFile(imageUrl);
        }
    }

    public static readImageMetaDataFromFile(imageFile): Promise<ImageData> {
        const buffer = fs.readFileSync(imageFile);
        return ImageUtils.readImageMetaDataFromBuffer(buffer);
    }

    public static readImageMetaDataFromUrl(imageFile): Promise<ImageData> {
        return new Promise<ImageData>((resolve, reject) => {
            return fetch(imageFile).then(response => {
                return ImageUtils.readImageMetaDataFromBuffer(response.body);
            }).catch(reason => {
                return reject(reason);
            });
        });
    }

    public static readImageMetaDataFromLocation(imageUrl: string): Promise<ImageData> {
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return TensorUtils.readImageMetaDataFromUrl(imageUrl);
        } else {
            return TensorUtils.readImageMetaDataFromFile(imageUrl);
        }
    }

    public static readImageTensorFromFile(imageFile): Promise<Tensor3D> {
        return new Promise<Tensor3D>((resolve, reject) => {
            this.readImageFromFile(imageFile).then(imageData => {
                return resolve(TensorUtils.imageToTensor3D(imageData, this.NUMBER_OF_CHANNELS));
            }).catch(reason => {
                return reject(reason);
            })
        });
    }

    public static readImageTensorFromUrl(imageFile): Promise<Tensor3D> {
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

    public static imageToTensor3D(image: ImageData, numChannels: number): Tensor3D {
        const values = ImageUtils.imageToInt32Array(image, numChannels);
        const outShape: [number, number, number] = [image.height, image.width, numChannels];

        return tf.tensor3d(values, outShape, 'int32');
    }

    public static getImageDimensionsFromTensor3D(tensor: Tensor3D): number[] {
        return [tensor.shape[1], tensor.shape[0]];
    }

    public static getImageDimensionsFromCommonInput(input: Tensor3D|ImageData): number[] {
        return (input['width'] !== undefined
            ? [(<ImageData>input).width, (<ImageData>input).height]
            : TensorUtils.getImageDimensionsFromTensor3D(<Tensor3D>input));
    }
}