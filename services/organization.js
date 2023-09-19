const {ERROR} = require("../constants/error-constants");
const {USER} = require("../constants/user-constants");
const {ORGANIZATION} = require("../constants/organization-constants");
const {getCurrentTime} = require("../utility/time-utility");

class Organization {
  constructor(organizationCollection) {
      this.organizationCollection = organizationCollection;
  }

  async getOrganizationByID(id) {
      const result = await this.organizationCollection.aggregate([{
          "$match": { _id: id }
      }, {"$limit": 1}]);
      return result?.length > 0 ? result[0] : null;
  }

  async getOrganizationByName(name) {
      const result = await this.organizationCollection.aggregate([{
          "$match": { name }
      }, {"$limit": 1}]);
      return result?.length > 0 ? result[0] : null;
  }

  async listOrganizations(filters) {
    return await this.organizationCollection.aggregate([{ "$match": filters }]);
  }

  async editOrganization(params, userCollection) {
      const currentOrg = await this.getOrganizationByID(params.orgID);
      const updatedOrg = { updateAt: getCurrentTime() };
      if (!currentOrg) {
          throw new Error(ERROR.ORG_NOT_FOUND);
      }

      if (params.name && params.name !== currentOrg.name) {
          const existingOrg = await this.getOrganizationByName(params.name);
          if (existingOrg) {
              throw new Error(ERROR.DUPLICATE_ORG_NAME);
          }
          updatedOrg.name = params.name;
      }

      if (params.conciergeID && params.conciergeID !== currentOrg.conciergeID) {
          const filters = { _id: params.conciergeID, role: USER.ROLES.CURATOR, userStatus: USER.STATUSES.ACTIVE };
          const result = await userCollection.aggregate([{ "$match": filters }, { "$limit": 1 }]);
          const conciergeUser = result?.[0];
          if (!conciergeUser) {
              throw new Error(ERROR.INVALID_ROLE_ASSIGNMENT);
          }
          updatedOrg.conciergeID = params.conciergeID;
          updatedOrg.conciergeName = `${conciergeUser.firstName} ${conciergeUser.lastName}`.trim();
          updatedOrg.conciergeEmail = conciergeUser.email;
      } else if (!params.conciergeID && currentOrg.conciergeID) {
          updatedOrg.conciergeID = null;
          updatedOrg.conciergeName = null;
          updatedOrg.conciergeEmail = null;
      }

      if (params.studies && Array.isArray(params.studies)) {
          updatedOrg.studies = params.studies;
      } else {
          updatedOrg.studies = [];
      }

      if (params.status && Object.values(ORGANIZATION.STATUSES).includes(params.status)) {
          updatedOrg.status = params.status;
      }

      const updateResult = await this.organizationCollection.update({ _id: params.orgID, ...updatedOrg });
      if (updateResult?.matchedCount !== 1) {
          throw new Error(ERROR.UPDATE_FAILED);
      }

      return { ...currentOrg, ...updatedOrg };
  }
}

module.exports = {
  Organization
};
