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
}

module.exports = {
  Organization
};
