import * as exifReader from 'exif';
import * as jpeg from 'jpeg-js';

export class ImageUtils {

    public static readImageDataFromBuffer(buf): ImageData {
        return jpeg.decode(buf, true);
    }

    public static readImageMetaDataFromBuffer(buf): Promise<ImageData> {
        return new Promise<ImageData>((resolve, reject) => {
            return ImageUtils.readExifForImage(buf).then(exif => {
                if (!exif || !exif['exif']) {
                    return reject('no exifdata found');
                }

                return resolve({
                    data: undefined,
                    width: exif['exif']['ExifImageWidth'] || exif['exif']['PixelXDimension'],
                    height: exif['exif']['ExifImageHeight'] || exif['exif']['PixelYDimension'],
                });
            }).catch(reason => {
                reject(reason);
            })
        });
    }

    public static readExifForImage(buf: string): Promise<{}> {
        return new Promise<{}>((resolve, reject) => {
            try {
                new exifReader.ExifImage({ image : buf }, function (error, exifData) {
                    if (error) {
                        reject(error);
                    }
                    resolve(exifData);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    public static imageToInt32Array(image: ImageData, numChannels: number): Int32Array {
        const pixels = image.data;
        const numPixels = image.width * image.height;
        const values = new Int32Array(numPixels * numChannels);

        for (let i = 0; i < numPixels; i++) {
            for (let channel = 0; channel < numChannels; ++channel) {
                values[i * numChannels + channel] = pixels[i * 4 + channel];
            }
        }

        return values
    }

}