export const InitialApplication: Omit<Application, "questionnaireData"> = {
  _id: "new",
  applicant: null,
  organization: null,
  status: 'New',
  createdAt: '',
  updatedAt: '',
  submittedDate: '',
  history: [],
  programName: '',
  studyAbbreviation: '',
};

export const InitialQuestionnaire: QuestionnaireData = {
  sections: [],
  pi: {
    firstName: "",
    lastName: "",
    position: "",
    email: "",
    institution: "",
    address: "",
  },
  piAsPrimaryContact: false,
  primaryContact: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    institution: ""
  },
  additionalContacts: [],
  program: {
    name: "",
    abbreviation: "",
    description: "",
    notApplicable: false,
    isCustom: false
  },
  study: {
    name: "",
    abbreviation: "",
    description: "",
    publications: [],
    plannedPublications: [],
    repositories: [],
    funding: [
      {
        agency: "",
        grantNumbers: "",
        nciProgramOfficer: "",
        nciGPA: "",
      }
    ],
    isDbGapRegistered: false,
    dbGaPPPHSNumber: "",
  },
  accessTypes: [],
  targetedSubmissionDate: "",
  targetedReleaseDate: "",
  timeConstraints: [],
  cancerTypes: [],
  otherCancerTypes: "",
  preCancerTypes: [],
  otherPreCancerTypes: "",
  numberOfParticipants: null,
  species: [],
  cellLines: false,
  modelSystems: false,
  imagingDataDeIdentified: null,
  dataDeIdentified: null,
  dataTypes: [],
  otherDataTypes: "",
  clinicalData: {
    dataTypes: [],
    otherDataTypes: "",
    futureDataTypes: false,
  },
  files: [{ type: ``, count: null, amount: "", extension: "" }],
  submitterComment: "",
};
