const {ERROR} = require("../constants/error-constants");
const {USER} = require("../constants/user-constants");

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

  async assignUserToOrganization(orgID, user, role) {
      const org = await this.getOrganizationByID(orgID);
      if (!org) {
          throw new Error(ERROR.INVALID_ORG_ID);
      }

      if (user.organization?.orgID) {
          await this.unassignUserFromOrganization(user.organization.orgID, user);
      }

      const pushBy = {};
      if (role === USER.ROLES.ORG_OWNER) {
          pushBy["owners"] = user._id;
      } else if (role === USER.ROLES.SUBMITTER) {
          pushBy["submitters"] = {
            userID: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt,
            updateAt: user.updateAt,
          };
      } else {
          throw new Error(ERROR.INVALID_ROLE_ASSIGNMENT);
      }

      const result = await this.organizationCollection.update({ _id: orgID }, { $push: { ...pushBy } });
      if (result?.modifiedCount !== 1) {
        throw new Error(ERROR.UPDATE_FAILED);
      }

      return await this.getOrganizationByID(orgID);
  }

  async unassignUserFromOrganization(orgID, { _id, role }) {
      const org = await this.getOrganizationByID(orgID);
      if (!org) {
          return true;
      }

      const pullBy = {};
      if (role === USER.ROLES.ORG_OWNER) {
          pullBy["owners"] = _id;
      } else if (role === USER.ROLES.SUBMITTER) {
          pullBy["submitters"] = { userID: _id };
      } else {
          throw new Error(ERROR.INVALID_ROLE_ASSIGNMENT);
      }

      const result = await this.organizationCollection.update({ _id: orgID }, { $pull: { ...pullBy } });
      return result?.modifiedCount === 1;
  }
}

module.exports = {
  Organization
};
