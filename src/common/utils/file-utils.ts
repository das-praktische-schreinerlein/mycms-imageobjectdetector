import * as readdirp from 'readdirp';
import * as Promise_serial from 'promise-serial';

export class FileUtils {
    public static getDirectoryFromFilePath(filePath): string {
        return filePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/') + '/';
    }
    public static getFilenameFromFilePath(filePath): string {
        return filePath.replace(/\\/g, '/').split('/').slice(-1)[0];
    }

    public static doActionOnFilesFromMediaDir(baseDir: string, destDir: string, destSuffix: string, mediaTypes: {},
                                                 commandExtender: any): Promise<{}> {
        const fileExtensions = [];
        for (const mediaType in mediaTypes) {
            fileExtensions.push('*.' + mediaType);
        }
        const settings = {
            root: baseDir,
            entryType: 'files',
            // Filter files with js and json extension
            fileFilter: fileExtensions,
            // Filter by directory
            directoryFilter: [ '!.git', '!*modules' ],
            // Work with files up to 1 subdirectory deep
            depth: 10
        };

        const media = {};

        return new Promise<{}>((resolve, reject) => {
            readdirp(settings, function fileCallBack(fileRes) {
                const srcPath = baseDir + '/' + fileRes['path'];
                const destPath = destDir + '/' + fileRes['path'] + destSuffix;
                const extension = srcPath.split('.').splice(-1)[0];
                const type = mediaTypes[extension];
                if (type === undefined) {
                    console.warn('SKIP file - unknown extension', srcPath);
                    return;
                }

                if (media[destPath]) {
                    return;
                }

                media[destPath] = srcPath;
            }, function allCallBack(errors, res) {
                if (errors) {
                    errors.forEach(function (err) {
                        return reject(err);
                    });
                }

                const funcs = [];
                let index = 1;
                const count = Object.keys(media).length;
                for (const destPath in media) {
                    const iindex = index;
                    index = index + 1;
                    funcs.push(function () { return new Promise<string>((processorResolve, processorReject) => {
                        return commandExtender(media[destPath], destPath, processorResolve, processorReject, iindex, count);
                    });
                    });
                }

                return Promise_serial(funcs, {parallelize: 1}).then(arrayOfResults => {
                    return resolve(media);
                }).catch(reason => {
                    return reject(reason);
                });
            });
        });
    };

}