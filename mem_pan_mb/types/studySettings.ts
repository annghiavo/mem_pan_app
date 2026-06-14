export interface StudySettings {
  shuffleTerms: boolean;
  textToSpeech: boolean;
  answerWithTerm: boolean;
  answerWithDefinition: boolean;
  questionTypeFlashcards: boolean;
  questionTypeMultipleChoice: boolean;
  questionTypeWritten: boolean;
  strictnessLevel: 'flexible' | 'strict';
  requireRetypingCorrectAnswer: boolean;
  newCardLimit: number;
  reviewCardLimit: number;
}

export const defaultStudySettings: StudySettings = {
  shuffleTerms: false,
  textToSpeech: false,
  answerWithTerm: true,
  answerWithDefinition: true,
  questionTypeFlashcards: false,
  questionTypeMultipleChoice: true,
  questionTypeWritten: true,
  strictnessLevel: 'flexible',
  requireRetypingCorrectAnswer: false,
  newCardLimit: 20,
  reviewCardLimit: 200,
};
