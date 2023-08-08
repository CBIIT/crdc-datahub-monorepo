type ProgramOption = Omit<Program, "description"> & {
  editable?: boolean = false;
};

type StudyOption = Omit<Study, "description" | "publications" | "plannedPublications" | "repositories" | "funding" | "isDbGapRegistered" | "dbGaPPPHSNumber"> & {
  isCustom?: true;
};
