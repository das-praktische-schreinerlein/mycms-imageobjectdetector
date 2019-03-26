import * as readdirp from 'readdirp';
import * as Promise_serial from 'promise-serial';
import * as fs from 'fs';
import {PathLike} from 'fs';
import {LogUtils} from '@dps/mycms-commons/dist/commons/utils/log.utils';
import * as path from 'path';

export class FileUtils {
    public static checkConcreteFile(filePath: PathLike): boolean {
        return fs.statSync(filePath).isFile() && !fs.statSync(filePath).isSymbolicLink();
    }

    public static checkConcreteDirectory(filePath: PathLike): boolean {
        return fs.statSync(filePath).isDirectory() && !fs.statSync(filePath).isSymbolicLink();
    }

    public static writeConcreteFileSync(filePath: PathLike, data: any, options?: any): void {
        if (fs.existsSync(filePath) && !FileUtils.checkConcreteFile(filePath)) {
            throw new Error('not a concrete file:' + LogUtils.sanitizeLogMsg(filePath));
        }

        return fs.writeFileSync(filePath, data, options);
    }

    public static readConcreteFileSync(filePath: PathLike, options?: {}): any {
        if (!FileUtils.checkConcreteFile(filePath)) {
            throw new Error('not a concrete file:' + LogUtils.sanitizeLogMsg(filePath));
        }


        return fs.readFileSync(filePath, options);
    }

    public static normalizePathSeparator(filePath): string {
        return filePath.replace(/\\/g, '/');
    }

    public static normalizePath(filePath): string {
        return path.normalize(filePath);
    }

    public static normalizeAsciiPath(filePath): string {
        const match = filePath.match(/(file:\/\/\/{0,1}){0,1}([a-zA-Z]:\/){0,1}(.*)/);
        if (match === undefined || match === null || match.length !== 4) {
            throw new Error('illegal filepath: ' + LogUtils.sanitizeLogMsg(filePath));
        }

        return (match[2] || '') + (match[3] || '').replace(/[^A-Za-zöüäßÖÜÄ0-9.\-_\/\\ ]/g, '');
    }

    public static normalizePathStrict(filePath): string {
        return FileUtils.normalizePath(FileUtils.normalizeAsciiPath(FileUtils.normalizePathSeparator(filePath)));
    }

    public static getDirectoryFromFilePath(filePath): string {
        return FileUtils.normalizePathSeparator(filePath).split('/').slice(0, -1).join('/') + '/';
    }

    public static getFilenameFromFilePath(filePath): string {
        return FileUtils.normalizePathSeparator(filePath).split('/').slice(-1)[0];
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