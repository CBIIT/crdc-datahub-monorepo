export const InitialApplication: Omit<Application, "questionnaireData"> = {
  _id: "new",
  applicant: null,
  status: "New",
  createdAt: "",
  updatedAt: "",
  submittedDate: "",
  history: [],
  controlledAccess: false,
  openAccess: false,
  ORCID: "",
  programName: "",
  studyAbbreviation: "",
  PI: "",
  conditional: false,
  pendingConditions: [],
  programAbbreviation: "",
  programDescription: "",
  version: "",
};

export const InitialQuestionnaire: QuestionnaireData = {
  sections: [],
  pi: {
    firstName: "",
    lastName: "",
    position: "",
    email: "",
    ORCID: "",
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
    institution: "",
  },
  additionalContacts: [],
  program: {
    _id: "",
    name: "",
    abbreviation: "",
    description: "",
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
      },
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
  otherCancerTypesEnabled: false,
  preCancerTypes: "",
  numberOfParticipants: null,
  species: [],
  otherSpeciesEnabled: false,
  otherSpeciesOfSubjects: "",
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
