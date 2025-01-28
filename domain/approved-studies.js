const {getCurrentTime} = require("../utility/time-utility");

class ApprovedStudies {
    constructor(studyName, studyAbbreviation, dbGaPID, organizationName, controlledAccess, ORCID, PI, openAccess, programName) {
        this.studyName = studyName;
        this.studyAbbreviation = studyAbbreviation;
        if (dbGaPID) {
            this.dbGaPID = dbGaPID;
        }
        // Optional
        if (organizationName) {
            this.originalOrg = organizationName;
        }
        if (ORCID) {
            this.ORCID = ORCID;
        }

        this.controlledAccess = Boolean(controlledAccess);

        if (PI) {
            this.PI = PI;
        }

        this.openAccess = Boolean(openAccess);

        if (programName !== undefined) {
            this.programName = programName?.trim();
        }
        this.createdAt = this.updatedAt = getCurrentTime();
    }

    static createApprovedStudies(studyName, studyAbbreviation, dbGaPID, organization, controlledAccess, ORCID, PI, openAccess, programName) {
        return new ApprovedStudies(studyName, studyAbbreviation, dbGaPID, organization, controlledAccess, ORCID, PI, openAccess, programName);
    }
}

module.exports = {
    ApprovedStudies
}
