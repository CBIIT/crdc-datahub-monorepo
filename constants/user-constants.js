module.exports = Object.freeze({
    USER: {
        ROLES: {
            ADMIN: "Admin",
            USER: "User",
            CURATOR: "Curator",
            FEDERAL_LEAD: "FederalLead",
            DC_POC: "DC_POC",
            NEW: "New",
        },
        STATUSES: {
            ACTIVE: "Active",
            INACTIVE: "Inactive",
            DISABLED: "Disabled"
        },
        IDPS: {
            NIH: "NIH",
            LOGIN_GOV: "Login.gov"
        }
    },
    ORG: {
        ROLES: {
            OWNER: "Owner",
            SUBMITTER: "Submitter",
            CONCIERGE: "Concierge"
        },
        STATUSES: {
            ACTIVE: "Active",
            INACTIVE: "Inactive",
            DISABLED: "Disabled"
        }
    }
});
