export interface LessonFormState {
  bookName: string;
  chapterName: string;
  title: string;
  pageNumber: string;
  videoNumber: string;
  videoTimestamp: string;
  mainText: string;
  sheikhExplanation: string;
  videoUrl: string;
  startTime: string;
  endTime: string;
  audioUrl: string;
  mediaUrl: string;
  mediaType: string;
  adminNote: string;
}

export const EMPTY_LESSON: LessonFormState = {
  bookName: '',
  chapterName: '',
  title: '',
  pageNumber: '',
  videoNumber: '',
  videoTimestamp: '',
  mainText: '',
  sheikhExplanation: '',
  videoUrl: '',
  startTime: '',
  endTime: '',
  audioUrl: '',
  mediaUrl: '',
  mediaType: '',
  adminNote: '',
};
