const {ERROR} = require("../constants/error-constants");
const {USER} = require("../constants/user-constants");
const {ORGANIZATION} = require("../constants/organization-constants");
const {getCurrentTime} = require("../utility/time-utility");
const { APPROVED_STUDIES_COLLECTION } = require("../database-constants");
const {v4} = require("uuid");

class Organization {
  constructor(organizationCollection, userCollection, submissionCollection, applicationCollection, approvedStudiesCollection) {
      this.organizationCollection = organizationCollection;
      this.userCollection = userCollection;
      this.submissionCollection = submissionCollection;
      this.applicationCollection = applicationCollection;
      this.approvedStudiesCollection = approvedStudiesCollection;
  }

  /**
   * Get Organization by ID API Interface.
   *
   * - `ADMIN` can call this API only
   *
   * @api
   * @param {{ orgID: string }} params Endpoint parameters
   * @param {{ cookie: Object, userInfo: Object }} context API request context
   * @returns {Promise<Object | null>} The organization with the given `orgID` or null if not found
   */
  async getOrganizationAPI(params, context) {
    if (!context?.userInfo?.email || !context?.userInfo?.IDP) {
      throw new Error(ERROR.NOT_LOGGED_IN);
    }
    if (context?.userInfo?.role !== USER.ROLES.ADMIN) {
        throw new Error(ERROR.INVALID_ROLE);
    }
    if (!params?.orgID) {
        throw new Error(ERROR.INVALID_ORG_ID);
    }

    return this.getOrganizationByID(params.orgID, false);
  }

  /**
   * Get an organization by it's `_id`
   *
   * @async
   * @param {string} id The UUID of the organization to search for
   * @param {boolean} [omitStudyLookup] Whether to omit the study lookup in the pipeline. For backward compatibility, default is false.
   * @returns {Promise<Object | null>} The organization with the given `id` or null if not found
   */
  async getOrganizationByID(id, omitStudyLookup = false) {
      const pipeline = [];

      if (!omitStudyLookup) {
          pipeline.push(
              {
                  $lookup: {
                      from: APPROVED_STUDIES_COLLECTION,
                      localField: "studies._id",
                      foreignField: "_id",
                      as: "studies"
                  }
              },
          );
      }

      pipeline.push({ "$match": { _id: id } });
      pipeline.push({ "$limit": 1 });
      const result = await this.organizationCollection.aggregate(pipeline);
      return result?.length > 0 ? result[0] : null;
  }

  /**
   * List Organizations API Interface.
   *
   * Any authenticated users can retrieve all organizations, no matter what role a user has or what organization a user is associated with.
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

    return this.listOrganizations({});
  }

  /**
   * List organizations by an optional set of filters
   *
   * @typedef {Object<string, any>} Filters K:V pairs of filters
   * @param {Filters} [filters] Filters to apply to the query
   * @param {boolean} [omitStudyLookup] Whether to omit the study lookup in the pipeline. Default is false
   * @returns {Promise<Object[]>} An array of Organizations
   */
    async listOrganizations(filters = {}, omitStudyLookup = false) {
        const pipeline = [];
        if (!omitStudyLookup) {
            pipeline.push(
                {
                    $lookup: {
                        from: APPROVED_STUDIES_COLLECTION,
                        localField: "studies._id",
                        foreignField: "_id",
                        as: "studies"
                    }
                },
            );
        }

        pipeline.push({ "$match": filters });
        return await this.organizationCollection.aggregate(pipeline);
    }

  /**
   * Edit Organization API Interface.
   *
   * - `ADMIN` can call this API only
   *
   * @api
   * @param {EditOrganizationInput} params Endpoint parameters
   * @param {{ cookie: Object, userInfo: Object }} context API request context
   * @returns {Promise<Object>} The modified organization
   */
  async editOrganizationAPI(params, context) {
    if (!context?.userInfo?.email || !context?.userInfo?.IDP) {
      throw new Error(ERROR.NOT_LOGGED_IN);
    }
    if (context?.userInfo?.role !== USER.ROLES.ADMIN) {
        throw new Error(ERROR.INVALID_ROLE);
    }
    if (!params?.orgID) {
        throw new Error(ERROR.INVALID_ORG_ID);
    }

    return this.editOrganization(params.orgID, params);
  }

  /**
   * Edit an organization by it's `_id` and a set of parameters
   *
   * @async
   * @typedef {{ orgID: string, name: string, conciergeID: string, studies: Object[], status: string }} EditOrganizationInput
   * @throws {Error} If the organization is not found or the update fails
   * @param {string} orgID The ID of the organization to edit
   * @param {EditOrganizationInput} params The organization input
   * @returns {Promise<Object>} The modified organization
   */
  async editOrganization(orgID, params) {
      const currentOrg = await this.getOrganizationByID(orgID);
      const updatedOrg = { updateAt: getCurrentTime() };
      if (!currentOrg) {
          throw new Error(ERROR.ORG_NOT_FOUND);
      }

      if (!currentOrg?.abbreviation && !params?.abbreviation?.trim()) {
          throw new Error(ERROR.ORGANIZATION_INVALID_ABBREVIATION);
      }

      if (params.name && params.name !== currentOrg.name) {
          const existingOrg = await this.getOrganizationByName(params.name);
          if (existingOrg) {
              throw new Error(ERROR.DUPLICATE_ORG_NAME);
          }
          updatedOrg.name = params.name;
      }

      const conciergeProvided = typeof params.conciergeID !== "undefined";
      // Only update the concierge if it is provided and different from the currently assigned concierge
      if (conciergeProvided && !!params.conciergeID && params.conciergeID !== currentOrg.conciergeID) {
          const filters = { _id: params.conciergeID, role: USER.ROLES.CURATOR, userStatus: USER.STATUSES.ACTIVE };
          const result = await this.userCollection.aggregate([{ "$match": filters }, { "$limit": 1 }]);
          const conciergeUser = result?.[0];
          if (!conciergeUser) {
              throw new Error(ERROR.INVALID_ROLE_ASSIGNMENT);
          }
          updatedOrg.conciergeID = params.conciergeID;
          updatedOrg.conciergeName = `${conciergeUser.firstName} ${conciergeUser.lastName}`.trim();
          updatedOrg.conciergeEmail = conciergeUser.email;
      // Only remove the concierge if it is purposely set to null and there is a currently assigned concierge
      } else if (conciergeProvided && !params.conciergeID && !!currentOrg.conciergeID) {
          updatedOrg.conciergeID = null;
          updatedOrg.conciergeName = null;
          updatedOrg.conciergeEmail = null;
      }

      if (params.studies && Array.isArray(params.studies)) {
          updatedOrg.studies = await this.#getApprovedStudies(params.studies);
      } else {
          updatedOrg.studies = [];
      }

      if (params.status && Object.values(ORGANIZATION.STATUSES).includes(params.status)) {
          updatedOrg.status = params.status;
      }

      if (params?.abbreviation?.trim()) {
          updatedOrg.abbreviation = params.abbreviation.trim();
      }

      if (params?.description?.trim()) {
          updatedOrg.description = params.description.trim();
      }

      const updateResult = await this.organizationCollection.update({ _id: orgID, ...updatedOrg });
      if (updateResult?.matchedCount !== 1) {
          throw new Error(ERROR.UPDATE_FAILED);
      }

      // Update all dependent objects only if the Organization Name has changed
      // NOTE: We're not waiting for these updates to complete before returning the updatedOrg
      if (updatedOrg.name) {
          this.submissionCollection.updateMany(
              { "organization._id": orgID },
              { "organization.name": updatedOrg.name }
          );
          this.userCollection.updateMany(
              { "organization.orgID": orgID },
              { "organization.orgName": updatedOrg.name, "organization.updateAt": updatedOrg.updateAt }
          );
          this.applicationCollection.updateMany(
            { "organization._id": orgID },
            { "organization.name": updatedOrg.name }
          );
      }

      return { ...currentOrg, ...updatedOrg };
  }

  /**
   * Get an organization by it's name
   *
   * @async
   * @param {string} name The name of the organization to search for
   * @param {boolean} [omitStudyLookup] Whether to omit the study lookup in the pipeline. Default is true
   * @returns {Promise<Object | null>} The organization with the given `name` or null if not found
   */
  async getOrganizationByName(name, omitStudyLookup = true) {
    const pipeline = [];

    if (!omitStudyLookup) {
        pipeline.push(
            {
                $lookup: {
                    from: APPROVED_STUDIES_COLLECTION,
                    localField: "studies._id",
                    foreignField: "_id",
                    as: "studies"
                }
            },
        );
    }

    pipeline.push({ "$match": { name } });
    pipeline.push({ "$limit": 1 });
    const result = await this.organizationCollection.aggregate(pipeline); 
    return result?.length > 0 ? result[0] : null;
  }

    /**
     * Create an Organization API Interface.
     *
     * - `ADMIN` can call this API only
     *
     * @api
     * @param {CreateOrganizationInput} params Endpoint parameters
     * @param {{ cookie: Object, userInfo: Object }} context API request context
     * @returns {Promise<Object>} The created organization
    */
  async createOrganizationAPI(params, context) {
    if (!context?.userInfo?.email || !context?.userInfo?.IDP) {
      throw new Error(ERROR.NOT_LOGGED_IN);
    }
    if (context?.userInfo?.role !== USER.ROLES.ADMIN) {
      throw new Error(ERROR.INVALID_ROLE);
    }

    if (!params?.abbreviation?.trim()) {
        throw new Error(ERROR.ORGANIZATION_INVALID_ABBREVIATION);
    }

    return this.createOrganization(params);
  }

  /**
   * Create a new Organization
   *
   * @async
   * @typedef {{ name: string, conciergeID?: string, studies?: Object[] }} CreateOrganizationInput
   * @throws {Error} If the organization name is already taken or the create action fails
   * @param {CreateOrganizationInput} params The organization input
   * @returns {Promise<Object>} The newly created organization
   */
  async createOrganization(params) {
      const newOrg = {
        _id: v4(),
        name: "",
        status: ORGANIZATION.STATUSES.ACTIVE,
        conciergeID: "",
        conciergeName: "",
        conciergeEmail: "",
        studies: [],
        abbreviation: params.abbreviation?.trim(),
        ...(params?.description && { description: params.description }),
        createdAt: getCurrentTime(),
        updateAt: getCurrentTime(),
    };

    if (!!params?.name?.trim()) {
        const existingOrg = await this.getOrganizationByName(params.name);
        if (existingOrg) {
            throw new Error(ERROR.DUPLICATE_ORG_NAME);
        }
        newOrg.name = params.name;
    } else {
        throw new Error(ERROR.INVALID_ORG_NAME);
    }

    if (!!params?.conciergeID) {
        const filters = { _id: params.conciergeID, role: USER.ROLES.CURATOR, userStatus: USER.STATUSES.ACTIVE };
        const result = await this.userCollection.aggregate([{ "$match": filters }, { "$limit": 1 }]);
        const conciergeUser = result?.[0];
        if (!conciergeUser) {
            throw new Error(ERROR.INVALID_ROLE_ASSIGNMENT);
        }
        newOrg.conciergeID = params.conciergeID;
        newOrg.conciergeName = `${conciergeUser.firstName} ${conciergeUser.lastName}`.trim();
        newOrg.conciergeEmail = conciergeUser.email;
    }

    if (params.studies && Array.isArray(params.studies)) {
        // @ts-ignore Incorrect linting type assertion
        newOrg.studies = await this.#getApprovedStudies(params.studies);
    }

    const result = await this.organizationCollection.insert(newOrg);
    if (!result?.acknowledged) {
        throw new Error(ERROR.CREATE_FAILED);
    }

    return { ...newOrg };
  }

    /**
    * Stores approved studies in the organization's collection.
    *
    * @param {string} orgID - The organization ID.
    * @param {object} studyID - The approved study ID
    * @returns {Promise<void>}
    */
    async storeApprovedStudies(orgID, studyID) {
        const aOrg = await this.getOrganizationByID(orgID, true);
        if (!aOrg || !studyID) {
            return;
        }
        const newStudies = [];
        const matchingStudy = aOrg?.studies.find((study) => studyID === study?._id);
        if (!matchingStudy) {
            newStudies.push({ _id: studyID });
        }

        if (newStudies.length > 0) {
            aOrg.studies = aOrg.studies || [];
            aOrg.studies = aOrg.studies.concat(newStudies);
            aOrg.updateAt = getCurrentTime();
            const res = await this.organizationCollection.update(aOrg);
            if (res?.modifiedCount !== 1) {
                console.error(ERROR.ORGANIZATION_APPROVED_STUDIES_INSERTION + ` orgID: ${orgID}`);
            }
        }
    }

    /**
     * List Organization IDs by a studyName API.
     * @api
     * @param {string} studyID
     * @returns {Promise<String[]>} An array of Organization ID
     */
    async findByStudyID(studyID) {
        return await this.organizationCollection.distinct("_id", {"studies._id": studyID});
    }

    /**
     * Retrieves approved studies in the approved studies collection.
     *
     * @param {object} studies - The studies object with studyID.
     * @returns {Promise<Object>} The approved studies
     */
  async #getApprovedStudies(studies) {
      const studyIDs = studies
          .filter((study) => study?.studyID)
          .map((study) => study.studyID);
      const approvedStudies = await Promise.all(studyIDs.map(async (id) => {
          const study = (await this.approvedStudiesCollection.find(id))?.pop();
          if (!study) {
              throw new Error(ERROR.INVALID_APPROVED_STUDY_ID);
          }
          return study;
      }));

      return approvedStudies?.map((study) => ({ _id: study?._id }));
  }
}

module.exports = {
  Organization
};
