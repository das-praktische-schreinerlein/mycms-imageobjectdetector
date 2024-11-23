import {ObjectDetectionDetectedObject, ObjectDetectionState} from '@dps/mycms-commons/dist/commons/model/objectdetection-model';
import {FileUtils} from './common/utils/file-utils';
import * as fs from 'fs';
import * as minimist from 'minimist';
import {DetectorResultDirectoryCacheService} from './objectdetection/utils/detectorresult-directorycache';
import * as process from 'process';

const argv = minimist(process.argv.slice(2));

// disable debug-logging
const debug = argv['debug'] || false;
const myLog: Function = console.log;
if (!debug) {
    console.log = function() {};
}
if (!debug || debug === true || parseInt(debug, 10) < 1) {
    console.trace = function() {};
    console.debug = function() {};
}

// check parameters
let faceDbFile = argv['faceDbFile'] || false;
if (faceDbFile === false) {
    console.error('parameter faceDbFile to process required');
    process.exit(-1);
}
faceDbFile = FileUtils.normalizePathStrict(faceDbFile);

let matchDbFile = argv['matchDbFile'] || false;
if (matchDbFile === false) {
    console.error('parameter matchDbFile to process required');
    process.exit(-1);
}
matchDbFile = FileUtils.normalizePathStrict(matchDbFile);

let minSimilarity = argv['minSimilarity'] || 0.6;
let minFacePrecision = argv['minFacePrecision'] || 0.6;
const order = 2;

let faceDBIds = {};
let faceMatchDBIds  = {};
let faceDB: ObjectDetectionDetectedObject[] = [];
let matchDB: ObjectDetectionSimilarityMatchType[] = [];

main()
    .then(() => console.log('DONE - facematcher'))
    .catch();

async function main() {
    const startdate = new Date();
    if (fs.existsSync(faceDbFile)) {
        myLog('DO - reading existing faceDbFile', faceDbFile);
        faceDB = JSON.parse( FileUtils.readConcreteFileSync(faceDbFile).toString());
        faceDB.forEach(face => face['objDescriptorArr'] = face.objDescriptor.split(',').map(s => parseFloat(s)));
        myLog('DONE - read existing faceDbFile', faceDbFile, faceDB.length + ' entries');
    } else {
        myLog('DO - creating not existing faceDbFile', faceDbFile);
        FileUtils.writeConcreteFileSync(faceDbFile, JSON.stringify(faceDB));
        myLog('DONE - creating not existing faceDbFile', faceDbFile, faceDB.length + ' entries');
    }

    if (fs.existsSync(matchDbFile)) {
        myLog('DO - reading existing matchDbFile', matchDbFile);
        matchDB = JSON.parse(FileUtils.readConcreteFileSync(matchDbFile).toString());
        matchDB.forEach(match => match.id = [match.ref1Id, match.ref2Id].sort().join('_:_'));
        myLog('DONE - read existing matchDbFile', matchDbFile, matchDB.length + ' entries');
    } else {
        myLog('DO - creating not existing matchDbFile', matchDbFile);
        FileUtils.writeConcreteFileSync(matchDbFile, JSON.stringify(matchDB));
        myLog('DONE - creating not existing matchDbFile', matchDbFile, matchDB.length + ' entries');
    }

    let cacheFiles = argv['cacheFiles'] || false;
    if (cacheFiles === false) {
        console.error('parameter cacheFiles to process required');
        process.exit(-1);
    }
    if (!Array.isArray(cacheFiles)) {
        cacheFiles = [cacheFiles];
    }

    const facesToFind: ObjectDetectionDetectedObject[] = await readInputCacheFiles(cacheFiles);
    const countFaceToFind = facesToFind.length;

    faceDBIds = faceDB.reduce(function(map, face, index) {
        map[face.objId] = index + 1;
        return map;
    }, {});
    faceMatchDBIds = matchDB.reduce(function(map, match, index) {
        map[match.id] = index + 1;
        return map;
    }, {});

    myLog('DONE - initialized', 'facedb:', faceDB.length, 'entries', 'matchdb:', matchDB.length, 'entries',
        new Date().getTime() - startdate.getTime(), 'ms');

    const detectionStartdate = new Date();
    myLog('DO - check facesToFind', countFaceToFind);
    for (let i = 0; i < countFaceToFind; i++) {
        const faceToFind = facesToFind[i];

        if (await existsFaceInFaceDB(faceToFind) < 0) {
            console.log('DO - new faceToFind', i, faceToFind.objId);
            await appendFaceToFaceDB(faceToFind);
        }

        console.log('DO - check faceToFind', i, faceToFind.objId);
        const imageDetectionStartdate = new Date();
        const matches: ObjectDetectionSimilarityMatchType[] = await findSimilarFaces(faceToFind, order);
        console.log('DETAILS - matches found for faceToFind', i + '/' + countFaceToFind, faceToFind.objId, 'minSimilarity:', minSimilarity,
            matches.filter(match => match.similarity > minSimilarity));
        myLog('DONE - check faceToFind', i + '/' + countFaceToFind, faceToFind.objId, matches.length, 'entries',
            new Date().getTime() - imageDetectionStartdate.getTime(), 'ms');
    }

    myLog('DONE - check facesToFind', countFaceToFind, 'facedb:', faceDB.length, 'entries', 'matchdb:', matchDB.length, 'entries',
        new Date().getTime() - detectionStartdate.getTime(), 'ms');

    faceDB.forEach(face => delete face['objDescriptorArr'])
    FileUtils.writeConcreteFileSync(faceDbFile, JSON.stringify(faceDB));
    myLog('DONE - write faceDbFile', faceDbFile, faceDB.length + ' entries');

    matchDB.forEach(match => delete match.id);
    FileUtils.writeConcreteFileSync(matchDbFile, JSON.stringify(matchDB));
    myLog('DONE - write matchDbFile', matchDbFile, matchDB.length + ' entries');
}

async function readInputCacheFiles(cacheFiles: string[]): Promise<ObjectDetectionDetectedObject[]> {
    const promises: Promise<ObjectDetectionDetectedObject[]>[] = [];
    for (let cacheFile of cacheFiles) {
        promises.push(readInputCacheFile(cacheFile))
    }

    const faceResults = await Promise.all(promises);
    let allFaces: ObjectDetectionDetectedObject[] = [];
    faceResults.map(faces => {
        allFaces = allFaces.concat(faces);
    });

    return allFaces;
}

async function readInputCacheFile(cacheFile: string): Promise<ObjectDetectionDetectedObject[]> {
    const detectorCache: DetectorResultDirectoryCacheService = new DetectorResultDirectoryCacheService(true, false, false);
    const cache = await detectorCache.readImageCacheFile(cacheFile, true);
    const faces: ObjectDetectionDetectedObject[] = [];
    const fieDir = FileUtils.getDirectoryFromFilePath(cacheFile);

    if (cache.detectors['humanapi'] == undefined) {
        console.log('SKIPPING - cache -> no humanapi-detector found');
        return;
    }

    const images = cache.detectors['humanapi'].images;
    for (let imageUrl in images) {
        const detections = images[imageUrl].results;
        for (let face of detections) {
            if (face.objType === 'face' && face.objDescriptor !== undefined && face.objDescriptor.length > 0) {
                if (face.precision < minFacePrecision) {
                    console.log('SKIPPING - imageObjectEntry -> precision < minFacePrecision', imageUrl, face.objId, face.objType, face.precision, minFacePrecision);
                    continue;
                }

                face['objDescriptorArr'] = face.objDescriptor.split(',').map(s => parseFloat(s));
                face.key = undefined;
                face.keyCorrection = undefined;
                face.state = ObjectDetectionState.OPEN;
                face.keySuggestion = undefined;
                face.detector = 'humanmatch';
                face.objType = 'facematch';
                face.fileName = fieDir + face.fileName;
                faces.push(face);
                continue;
            }

            console.log('SKIPPING - imageObjectEntry -> no face', imageUrl, face.objId, face.objType);
        }
    }

    return faces;
}

async function findSimilarFaces(faceToFind:  ObjectDetectionDetectedObject, order: number): Promise<ObjectDetectionSimilarityMatchType[]>  {
    const matches: ObjectDetectionSimilarityMatchType[] = [];
    const faceToFindId = faceToFind.objId;
    let idx = 0;
    let face = await readNextFaceFromFaceDB(idx);
    while (face !== undefined) {
        idx = idx + 1;
        if (face.objId === faceToFindId) {
            console.log('SKIPPING - dont detecting myself', faceToFindId);
            face = await readNextFaceFromFaceDB(idx);
            continue;
        }

        const matchId = [faceToFindId, face.objId].sort().join('_:_');
        if (await existsMatchInFaceMatchDB(matchId) >= 0) {
            console.log('SKIPPING - match already exists', matchId, faceToFindId);
            matches.push(await readMatchInFaceMatchDB(matchId));
            face = await readNextFaceFromFaceDB(idx);
            continue;
        }

        console.log('CHECK - for match exists', faceToFindId, face.objId);
        const matchDistance = await distanceObjectDetectionDetectedObject(faceToFind, face, order);
        const matchSimilarity = await similarity(matchDistance);
        const match: ObjectDetectionSimilarityMatchType = {
            id: matchId,
            ref1Id: faceToFindId,
            ref2Id: face.objId,
            similarity: matchSimilarity
        }

        await appendMatchToFaceMatchDB(match);
        matches.push(match);
        face = await readNextFaceFromFaceDB(idx);
    }

    return matches;
}

interface ObjectDetectionSimilarityMatchType {
    id: string;
    ref1Id: string;
    ref2Id: string;
    similarity: number;
}

async function readNextFaceFromFaceDB(idx: number): Promise<ObjectDetectionDetectedObject> {
    if (idx >= faceDB.length || idx < 0) {
        return undefined;
    }

    return faceDB[idx]
}

async function appendFaceToFaceDB(face: ObjectDetectionDetectedObject): Promise<number> {
    const idx = faceDB.push(face);
    faceDBIds['' + face.objId] = idx;

    return idx;
}

async function existsFaceInFaceDB(face: ObjectDetectionDetectedObject):  Promise<number> {
    const idx = faceDBIds['' + face.objId];
    return idx !== undefined
        ? idx - 1
        : - 1;
}

async function appendMatchToFaceMatchDB(match: ObjectDetectionSimilarityMatchType):  Promise<number> {
    const idx = matchDB.push(match);
    faceMatchDBIds['' + match.id] = idx;
    return idx;
}

async function existsMatchInFaceMatchDB(matchId: string):  Promise<number> {
    const idx = faceMatchDBIds['' + matchId];
    return idx !== undefined
        ? idx - 1
        : - 1;
}

async function readMatchInFaceMatchDB(matchId: string):  Promise<ObjectDetectionSimilarityMatchType> {
    const idx = await existsMatchInFaceMatchDB(matchId);
    return idx >= 0
        ? matchDB[idx]
        : undefined;
}

async function distanceObjectDetectionDetectedObject(object1: ObjectDetectionDetectedObject,
                                                     object2: ObjectDetectionDetectedObject, order = 2): Promise<number> {
    return await distance(object1['objDescriptorArr'], object2['objDescriptorArr'], order);
}

async function distance(embedding1: any, embedding2: any, order = 2): Promise<number> { // distance function in js
    // general minkowski distance, euclidean distance is limited case where order is 2
    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
        const diff = (order === 2) ? (embedding1[i] - embedding2[i]) : (Math.abs(embedding1[i] - embedding2[i]));
        sum += (order === 2) ? (diff * diff) : (diff ** order); // optimize for square
    }

    return sum;
}

async function similarity(distance: number): Promise<number> {
    return Math.max(0, 100 - distance) / 100.0;
}

