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

  /**
  * Retrieves an organization from the database by its name.
  *
  * @param {string} name - The name of the organization to search for.
  * @returns {Object|null} - The organization object if found, or null if not found.
  */
  async getOrganizationByName(name) {
      const result = await this.organizationCollection.aggregate([{
          "$match": { name }
      }, {"$limit": 1}]);
      return result?.length > 0 ? result[0] : null;
  }

  /**
   * List Organizations API Interface.
   *
   * - `ADMIN` and `ORG_OWNER can call this API
   * - `ORG_OWNER` is limited to only their organization
   *
   * @api
   * @param {Object} params Endpoint parameters
   * @param {{ cookie: Object, userInfo: Object }} context request context
   * @returns {Promise<Object[]>} An array of Organizations
   */
  async listOrganizationsAPI(params, context) {
    if (!context?.userInfo?.email || !context?.userInfo?.IDP) {
        throw new Error(ERROR.NOT_LOGGED_IN)
    }
    if (context?.userInfo?.role !== USER.ROLES.ADMIN && context?.userInfo.role !== USER.ROLES.ORG_OWNER) {
        throw new Error(ERROR.INVALID_ROLE);
    }
    if (context.userInfo.role === USER.ROLES.ORG_OWNER && !context?.userInfo?.organization?.orgID) {
        throw new Error(ERROR.NO_ORG_ASSIGNED);
    }

    const filters = {};
    if (context?.userInfo?.role === USER.ROLES.ORG_OWNER) {
        filters["_id"] = context?.userInfo?.organization?.orgID;
    }

    return this.listOrganizations(filters);
  }

  /**
   * List organizations by an optional set of filters
   *
   * @typedef {Object<string, any>} Filters K:V pairs of filters
   * @param {Filters} [filters] Filters to apply to the query
   * @returns {Promise<Object[]>} An array of Organizations
   */
  async listOrganizations(filters = []) {
    return await this.organizationCollection.aggregate([{ "$match": filters }]);
  }
}

module.exports = {
  Organization
};
