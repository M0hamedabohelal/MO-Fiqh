import { getFirestore } from './config';
import type { StopMarkRecord } from '../features/stopMarks/model';

export interface StopMarksSnapshotMetadata {
  hasPendingWrites: boolean;
  fromCache: boolean;
}

export type StopMarksSnapshotHandler = (documents: Record<string, unknown>, metadata: StopMarksSnapshotMetadata) => void;

export async function subscribeToStopMarks(
  uid: string,
  onSnapshot: StopMarksSnapshotHandler,
  onError: (error: Error) => void,
): Promise<() => void> {
  const { db, fsMod } = await getFirestore();
  const marksCollection = fsMod.collection(db, 'users', uid, 'stopMarksV2');
  return fsMod.onSnapshot(marksCollection, { includeMetadataChanges: true }, (snapshot) => {
    const documents: Record<string, unknown> = {};
    snapshot.forEach((document) => { documents[document.id] = document.data(); });
    onSnapshot(documents, {
      hasPendingWrites: snapshot.metadata.hasPendingWrites,
      fromCache: snapshot.metadata.fromCache,
    });
  }, onError);
}

export async function writeStopMark(uid: string, bookKey: string, record: StopMarkRecord): Promise<void> {
  const { db, fsMod } = await getFirestore();
  const markRef = fsMod.doc(db, 'users', uid, 'stopMarksV2', bookKey);
  // سجل الحذف المنطقي (lessonId=null) يبقى مستندًا كي لا تعيده لقطة جهاز قديم.
  await fsMod.setDoc(markRef, record);
}
