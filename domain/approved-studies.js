const {getCurrentTime} = require("../utility/time-utility");
const {v4} = require("uuid");
const {isUndefined} = require("../../utility/string-util");

class ApprovedStudies {
    constructor(studyName, studyAbbreviation, dbGaPID, organizationName, controlledAccess) {
        this._id = v4();
        this.studyName = studyName;
        this.studyAbbreviation = studyAbbreviation;
        if (dbGaPID) {
            this.dbGaPID = dbGaPID;
        }
        // Optional
        if (organizationName) {
            this.originalOrg = organizationName;
        }

        if (!isUndefined(controlledAccess)) {
            this.controlledAccess = controlledAccess;
        }
        this.createdAt = this.updatedAt = getCurrentTime();
    }

    static createApprovedStudies(studyName, studyAbbreviation, dbGaPID, organization, controlledAccess) {
        return new ApprovedStudies(studyName, studyAbbreviation, dbGaPID, organization, controlledAccess);
    }
}

module.exports = {
    ApprovedStudies
}
