import * as exifReader from 'exif';
import * as jpeg from 'jpeg-js';
import {createCanvas, Image} from 'canvas';

export class ImageUtils {

    public static readImageDataFromBuffer(buf):ImageData  {
        return this.readImageDataFromBufferWithCanvas(buf);
    }

    public static readImageDataFromBufferWithCanvas(buf):ImageData  {
        const start = new Date();
        const img = new Image();
        img.onerror = err => { throw err };
        img.src = buf;
        const canvas = createCanvas(img.width, img.height);
        canvas.getContext('2d').drawImage(img, 0, 0);

        const ret = canvas.getContext('2d').getImageData(0, 0, img.width, img.height);
        // console.debug('duration decoding image via canvas:', new Date().getTime() - start.getTime());
        return {
            colorSpace: 'srgb',
            data: ret.data,
            height: ret.height,
            width: ret.width
        };
    }

    public static readImageDataFromBufferWithJpeg(buf): ImageData {
        const start = new Date();
        const ret = jpeg.decode(buf, true);
        // console.debug('duration decoding image via jpeg:', new Date().getTime() - start.getTime());
        return ret;
    }

    public static readImageMetaDataFromBuffer(buf): Promise<ImageData> {
        return new Promise<ImageData>((resolve, reject) => {
            return ImageUtils.readExifForImage(buf).then(exif => {
                buf = undefined;
                if (!exif || !exif['exif']) {
                    console.error('cant read exif from buffer: no exifdata found');
                    return resolve(this.readImageDataFromBuffer(buf));
                }

                return resolve({
                    colorSpace: 'srgb',
                    data: undefined,
                    width: exif['exif']['ExifImageWidth'] || exif['exif']['PixelXDimension'],
                    height: exif['exif']['ExifImageHeight'] || exif['exif']['PixelYDimension'],
                });
            }).catch(reason => {
                console.error('cant read exif from buffer:', reason);
                return resolve(this.readImageDataFromBuffer(buf));
            })
        });
    }

    public static readExifForImage(buf: string): Promise<{}> {
        return new Promise<{}>((resolve, reject) => {
            try {
                new exifReader.ExifImage({ image : buf }, function (error, exifData) {
                    buf = undefined;
                    if (error) {
                        return reject(error);
                    }

                    return resolve(exifData);
                });
            } catch (error) {
                buf = undefined;
                return reject(error);
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
