const AWS = require('aws-sdk');
const {SUBMITTED, APPROVED, REJECTED, IN_PROGRESS, IN_REVIEW, DELETED, NEW, API_TOKEN} = require("../constants/application-constants");
const {APPLICATION_COLLECTION: APPLICATION} = require("../crdc-datahub-database-drivers/database-constants");
const {v4} = require('uuid')
const {getCurrentTime, subtractDaysFromNow} = require("../crdc-datahub-database-drivers/utility/time-utility");
const {HistoryEventBuilder} = require("../domain/history-event");
const {verifyApplication} = require("../verifier/application-verifier");
const {verifySession, verifyApiToken,verifySubmitter} = require("../verifier/user-info-verifier");
const ERROR = require("../constants/error-constants");
const {getSortDirection} = require("../crdc-datahub-database-drivers/utility/mongodb-utility");
const USER_CONSTANTS = require("../crdc-datahub-database-drivers/constants/user-constants");
const {USER} = require("../crdc-datahub-database-drivers/constants/user-constants");
const {CreateApplicationEvent, UpdateApplicationStateEvent} = require("../crdc-datahub-database-drivers/domain/log-events");
const {LogService} = require("./log-file");
const ROLES = USER_CONSTANTS.USER.ROLES;
const config = require('../config');

class Application {
    constructor(logCollection, applicationCollection, submissionollection, organizationService, userService, dbService, notificationsService, emailParams, submissions) {
        this.logCollection = logCollection;
        this.applicationCollection = applicationCollection;
        this.organizationService = organizationService;
        this.userService = userService;
        this.dbService = dbService;
        this.notificationService = notificationsService;
        this.emailParams = emailParams;
        this.submissions = submissionollection;

    }

    async getApplication(params, context) {
        verifySession(context)
            .verifyInitialized();
        const application = await this.getApplicationById(params._id);
        const isAdminOrFedLead = [USER.ROLES.ADMIN, USER.ROLES.FEDERAL_LEAD].includes(context.userInfo?.role);
        const isSubmitter = application?.applicant?.applicantID === context?.userInfo?._id;
        if (!isAdminOrFedLead && !isSubmitter){
            throw new Error(ERROR.INVALID_PERMISSION);
        }
        return application;
    }

    async getApplicationById(id) {
        let result = await this.applicationCollection.find(id);
        if (!result?.length || result.length < 1) throw new Error(ERROR.APPLICATION_NOT_FOUND+id);
        return result[0];
    }

    async reviewApplication(params, context) {
        const application = await this.getApplication(params, context);
        verifyApplication(application)
            .notEmpty()
            .state([IN_REVIEW, SUBMITTED]);
        if (application && application.status && application.status === SUBMITTED) {
            // If Submitted status, change it to In Review
            const history = HistoryEventBuilder.createEvent(context.userInfo._id, IN_REVIEW, null);
            const updated = await this.dbService.updateOne(APPLICATION, {_id: params._id}, {
                $set: {status: IN_REVIEW, updatedAt: history.dateTime},
                $push: {history}
            });
            if (updated?.modifiedCount && updated?.modifiedCount > 0) {
                const promises = [
                    await this.getApplicationById(params._id),
                    this.logCollection.insert(
                        UpdateApplicationStateEvent.create(context.userInfo._id, context.userInfo.email, context.userInfo.IDP, application._id, application.status, IN_REVIEW)
                    )
                ];
                return await Promise.all(promises).then(function(results) {
                    return results[0];
                });
            }
        }
        return application || null;
    }

    async createApplication(application, userInfo) {
        let newApplicationProperties = {
            _id: v4(undefined, undefined, undefined),
            status: NEW,
            applicant: {
                applicantID: userInfo._id,
                applicantName: formatApplicantName(userInfo),
                applicantEmail: userInfo.email
            },
            organization: {
                _id: userInfo?.organization?.orgID,
                name: userInfo?.organization?.orgName
            },
            history: [HistoryEventBuilder.createEvent(userInfo._id, NEW, null)],
            createdAt: application.updatedAt
        };
        application = {
            ...application,
            ...newApplicationProperties
        };
        const res = await this.applicationCollection.insert(application);
        if (res?.acknowledged) await this.logCollection.insert(CreateApplicationEvent.create(userInfo._id, userInfo.email, userInfo.IDP, application._id));
        return application;
    }

    async saveApplication(params, context) {
        verifySession(context)
            .verifyInitialized();
        let inputApplication = params.application;
        inputApplication.updatedAt = getCurrentTime();
        const id = inputApplication?._id;
        if (!id) {
            return await this.createApplication(inputApplication, context.userInfo);
        }
        const storedApplication = await this.getApplicationById(id);
        const prevStatus = storedApplication?.status;
        let application = {...storedApplication, ...inputApplication, status: IN_PROGRESS};
        application = await updateApplication(this.applicationCollection, application, prevStatus, context?.userInfo?._id);
        if (prevStatus !== application.status){
            await logStateChange(this.logCollection, context.userInfo, application, prevStatus);
        }
        return application;
    }

    async getMyLastApplication(params, context) {
        verifySession(context)
            .verifyInitialized();
        const userID = context.userInfo._id;
        const matchApplicantIDToUser = {"$match": {"applicant.applicantID": userID, status: APPROVED}};
        const sortCreatedAtDescending = {"$sort": {createdAt: -1}};
        const limitReturnToOneApplication = {"$limit": 1};
        const pipeline = [
            matchApplicantIDToUser,
            sortCreatedAtDescending,
            limitReturnToOneApplication
        ];
        const result = await this.applicationCollection.aggregate(pipeline);
        return result.length > 0 ? result[0] : null;
    }

    listApplicationConditions(userID, userRole) {
        // list all applications
        const validApplicationStatus = {status: {$in: [NEW, IN_PROGRESS, SUBMITTED, IN_REVIEW, APPROVED, REJECTED]}};
        const listAllApplicationRoles = [USER.ROLES.ADMIN, USER.ROLES.FEDERAL_LEAD];
        if (listAllApplicationRoles.includes(userRole)) return [{"$match": {...validApplicationStatus}}];
        // search by applicant's user id
        let conditions = [{$and: [{"applicant.applicantID": userID}, validApplicationStatus]}];
        return [{"$match": {"$or": conditions}}];
    }

    async listApplications(params, context) {
        verifySession(context)
            .verifyInitialized();
        let pipeline = this.listApplicationConditions(context.userInfo._id, context.userInfo?.role);
        if (params.orderBy) pipeline.push({"$sort": { [params.orderBy]: getSortDirection(params.sortDirection) } });

        const pagination = [];
        if (params.offset) pagination.push({"$skip": params.offset});
        const disablePagination = Number.isInteger(params.first) && params.first === -1;
        if (!disablePagination) {
            pagination.push({"$limit": params.first});
        }
        const promises = [
            await this.applicationCollection.aggregate((!disablePagination) ? pipeline.concat(pagination) : pipeline),
            await this.applicationCollection.aggregate(pipeline)
        ];

        return await Promise.all(promises).then(function(results) {
            return {
                applications: (results[0] || []).map((app)=>(app)),
                total: results[1]?.length || 0
            }
        });
    }

    async submitApplication(params, context) {
        verifySession(context)
            .verifyInitialized();
        const application = await this.getApplicationById(params._id);
        verifyApplication(application)
            .notEmpty()
            .state([NEW, IN_PROGRESS]);
        // In Progress -> In Submitted
        const history = application.history || [];
        const historyEvent = HistoryEventBuilder.createEvent(context.userInfo._id, SUBMITTED, null);
        history.push(historyEvent)
        const aApplication = {
            ...application,
            history: history,
            status: SUBMITTED,
            updatedAt: historyEvent.dateTime,
            submittedDate: historyEvent.dateTime
        };
        const updated = await this.applicationCollection.update(aApplication);
        if (!updated?.modifiedCount || updated?.modifiedCount < 1) throw new Error(ERROR.UPDATE_FAILED);
        const logEvent = UpdateApplicationStateEvent.create(context.userInfo._id, context.userInfo.email, context.userInfo.IDP, application._id, application.status, SUBMITTED);
        await Promise.all([
            await this.logCollection.insert(logEvent),
            await sendEmails.submitApplication(this.notificationService,this.emailParams,context, application)
        ]);
        return application;
    }

    async reopenApplication(document, context) {
        const application = await this.getApplicationById(document._id);
        // TODO 1. If Reviewer opened the application, the status changes to IN_REVIEW
        if (application && application.status) {
            const history = HistoryEventBuilder.createEvent(context.userInfo._id, IN_PROGRESS, null);
            const updated = await this.dbService.updateOne(APPLICATION, {_id: document._id}, {
                $set: {status: IN_PROGRESS, updatedAt: history.dateTime},
                $push: {history}
            });
            if (updated?.modifiedCount && updated?.modifiedCount > 0) {
                const promises = [
                    await this.getApplicationById(document._id),
                    await this.logCollection.insert(UpdateApplicationStateEvent.create(context.userInfo._id, context.userInfo.email, context.userInfo.IDP, application._id, application.status, IN_PROGRESS))
                ];
                return await Promise.all(promises).then(function(results) {
                    return results[0];
                });
            }
        }
        return application;
    }

    async deleteApplication(document, context) {
        // TODO Deleting the application requires permission control.
        const aApplication = await this.getApplicationById(document._id);
        const validApplicationStatus = [NEW, IN_PROGRESS, SUBMITTED, IN_REVIEW, APPROVED, REJECTED];
        if (validApplicationStatus.includes(aApplication.status)) {
            const history = HistoryEventBuilder.createEvent(context.userInfo._id, DELETED, null);
            const updated = await this.dbService.updateOne(APPLICATION, {_id: document._id}, {
                $set: {status: DELETED, updatedAt: history.dateTime},
                $push: {history}
            });
            return (updated?.modifiedCount && updated?.modifiedCount > 0) ? await this.getApplicationById(document._id) : null;
        }
        return aApplication;
    }

    async approveApplication(document, context) {
        verifyReviewerPermission(context);
        const application = await this.getApplicationById(document._id);
        // In Reviewed -> Approved
        verifyApplication(application)
            .notEmpty()
            .state([IN_REVIEW, SUBMITTED]);
        const history = HistoryEventBuilder.createEvent(context.userInfo._id, APPROVED, document.comment);
        const updated = await this.dbService.updateOne(APPLICATION, {_id: document._id}, {
            $set: {reviewComment: document.comment, wholeProgram: document.wholeProgram, status: APPROVED, updatedAt: history.dateTime},
            $push: {history}
        });
        await this.sendEmailAfterApproveApplication(context, application);
        if (updated?.modifiedCount && updated?.modifiedCount > 0) {
            const promises = [
                await this.getApplicationById(document._id),
                this.logCollection.insert(
                    UpdateApplicationStateEvent.create(context.userInfo._id, context.userInfo.email, context.userInfo.IDP, application._id, application.status, APPROVED)
                )
            ];
            return await Promise.all(promises).then(function(results) {
                return results[0];
            });
        }
        return null;
    }

    async rejectApplication(document, context) {
        verifyReviewerPermission(context);
        const application = await this.getApplicationById(document._id);
        // In Reviewed -> Rejected
        verifyApplication(application)
            .notEmpty()
            .state([IN_REVIEW, SUBMITTED]);
        const history = HistoryEventBuilder.createEvent(context.userInfo._id, REJECTED, document.comment);
        const updated = await this.dbService.updateOne(APPLICATION, {_id: document._id}, {
            $set: {reviewComment: document.comment, status: REJECTED, updatedAt: history.dateTime},
            $push: {history}
        });
        await this.sendEmailAfterRejectApplication(context, application);
        if (updated?.modifiedCount && updated?.modifiedCount > 0) {
            const log = UpdateApplicationStateEvent.create(context.userInfo._id, context.userInfo.email, context.userInfo.IDP, application._id, application.status, REJECTED);
            const promises = [
                await this.getApplicationById(document._id),
                this.logCollection.insert(log)
            ];
            return await Promise.all(promises).then(function(results) {
                return results[0];
            });
        }
        return null;
    }

    async deleteInactiveApplications() {
        const inactiveCondition = {
            updatedAt: {
                $lt: subtractDaysFromNow(this.emailParams.inactiveDays)
            },
            status: {$in: [NEW, IN_PROGRESS, REJECTED]}
        };
        const applications = await this.applicationCollection.aggregate([{$match: inactiveCondition}]);
        verifyApplication(applications)
            .isUndefined();

        if (applications?.length > 0) {
            const history = HistoryEventBuilder.createEvent(0, DELETED, "Deleted because of no activities after submission");
            const updated = await this.dbService.updateMany(APPLICATION,
                inactiveCondition,
                {
                    $set: {status: DELETED, updatedAt: history.dateTime},
                    $push: {history}});
            if (updated?.modifiedCount && updated?.modifiedCount > 0) {
                console.log("Executed to delete application(s) because of no activities at " + getCurrentTime());
                await Promise.all(applications.map(async (app) => {
                    await sendEmails.inactiveApplications(this.notificationService,this.emailParams, app?.applicant?.applicantEmail, app?.applicant?.applicantName, app);
                }));
                // log disabled applications
                await Promise.all(applications.map(async (app) => {
                    this.logCollection.insert(UpdateApplicationStateEvent.createByApp(app._id, app.status, DELETED));
                }));
            }
        }
    }

    async remindApplicationSubmission() {
        const inactiveDuration = this.emailParams.remindDay;
        const remindCondition = {
            updatedAt: {
                $lt: subtractDaysFromNow(inactiveDuration),
                $gt: subtractDaysFromNow(inactiveDuration + 1),
            },
            status: {$in: [NEW, IN_PROGRESS, REJECTED]},
            inactiveReminder: {$ne: true}
        };
        const applications = await this.applicationCollection.aggregate([{$match: remindCondition}]);
        if (applications?.length > 0) {
            await Promise.all(applications.map(async (app) => {
                await sendEmails.remindApplication(this.notificationService, this.emailParams, app?.applicant?.applicantEmail, app?.applicant?.applicantName, app);
            }));
            const applicationIDs = applications.map(app => app._id);
            const query = {_id: {$in: applicationIDs}};
            const updatedReminder = await this.applicationCollection.updateMany(query, {inactiveReminder: true});
            if (!updatedReminder?.modifiedCount || updatedReminder?.modifiedCount === 0) {
                console.error("The email reminder flag intended to notify the inactive application user is not being stored");
            }
        }
    }

    async sendEmailAfterApproveApplication(context, application) {
        // org owner email
        let org = await this.organizationService.getOrganizationByID(application?.organization?._id);
        let org_owner_email = null
        let org_owner_id = org?.owner
        if(org_owner_id){
            let org_owner = await this.userService.getUserByID(org_owner_id);
            if(org_owner?.email){
                org_owner_email = org_owner?.email
            }
        }
        // concierge email
        let concierge_email = null
        let org_concierge_id = org?.concierges
        if(org_concierge_id){
            let org_concierge = await this.userService.getUserByID(org_concierge_id);
            if(org_concierge?.email){
                concierge_email = org_concierge?.email
            }
        }
        // admin email
        let admin_user = await this.userService.getAdmin();
        let admin_email = ""
        for(let i of admin_user){
            admin_email = admin_email + " ; " + i.email
        }
        // cc emil
        let cc_email
        if(concierge_email){
            cc_email = concierge_email
        }else{
            cc_email = admin_email
        }
        // submission documentation 
        let sub_doc_url = config.submission_doc_url
        // email body
        // doc_url 
        let doc_url
        if(!sub_doc_url){
            doc_url = `log into the submission system ${config.submission_system_portal}`
        } else {
            doc_url = `review the submission documentation ${sub_doc_url}`
        }
        // concierge_email = null
        // contact detail
        let contact_detail = `either your organization ${org_owner_email} or your CRDC Data Team member ${concierge_email}.`
        if(!org_owner_email &&!concierge_email ){
            contact_detail = `the Submission Helpdesk ${config.submision_helpdesk}`
        } else if(!org_owner_email){
            contact_detail = `your CRDC Data Team member ${concierge_email}`
        } else if(!concierge_email){
            contact_detail = `either your organization ${org_owner_email} or the Submission Helpdesk ${config.submision_helpdesk}`
        }
        await this.notificationService.approveQuestionNotification(application?.applicant?.applicantEmail,
            // Organization Owner and concierge assigned/Super Admin
            `${org_owner_email} ; ${cc_email}`,
        {
            firstName: application?.applicant?.applicantName
        }, {
            study: application?.studyAbbreviation,
            doc_url: doc_url,
            contact_detail: contact_detail
        })
    }

    async sendEmailAfterRejectApplication(context, application) {
        await this.notificationService.rejectQuestionNotification(application?.applicant?.applicantEmail, {
            firstName: application?.applicant?.applicantName
        }, {
            study: application?.studyAbbreviation,
            url: this.emailParams.url
        })
    }

    /**
     * createTempCredentials
     * @param {*} context 
     * @param {*} submissionID 
     * @returnsv {
            accessKeyId: String
            secretAccessKey: String
            sessionToken: String
        }
     */
    async createTempCredentials(params, context) {
        //1. verify token and decode token to get user info
        const userInfo = verifyApiToken(context, config);
        //verify submitter
        await verifySubmitter(userInfo, params?.submissionID, this.submissions, this.userService);
        //2. create temp credential
        // Initialize an STS object
        const sts = new AWS.STS();
        const timestamp = (new Date()).getTime();
        const s3Params = {
            RoleArn: config.role_arn,
            RoleSessionName: `Temp_Session_${timestamp}`
        };
        return new Promise((resolve, reject) => {     
            sts.assumeRole(s3Params, (err, data) => {
                if (err) reject(err);
                else {
                    resolve({
                        accessKeyId: data.Credentials.AccessKeyId,
                        secretAccessKey: data.Credentials.SecretAccessKey,
                        sessionToken: data.Credentials.SessionToken,
                    });
                }
            });
        });
    }
    /**
     * API to get list of upload log files
     * @param {*} params 
     * @param {*} context 
     * @returns filelist []
     */
    async listLogs(params, context){
        //1) verify session
        verifySession(context)
            .verifyInitialized();
        //2) verify submitter
        const submission = await verifySubmitter(context.userInfo, params?.submissionID, this.submissions, this.userService);
        //3) get upload log files
        //getUploadLogList(bucket, rootPath, orgId, submissionId)
        let rootPath = submission.rootPath;
        if(!rootPath){
            let orgId = null;
            if(typeof submission.organization != "string"){
                orgId =submission.organization._id
            }   
            else{
                const org = await this.organizationService.getOrganizationByName(submission.organization);
                orgId = org._id;
            }
                
            rootPath = `${orgId}/${params.submissionID}`;
        }
        const logService = new LogService(config.submission_aws_bucket_name, rootPath);
        try {
            const fileList = await logService.getLogList();
            return {logFiles: fileList} 
        }
        catch(err)
        {
            throw new Error(`${ERROR.FAILED_LIST_LOG}, ${params.submissionID}! ${err}`);
        }
    }
}

function formatApplicantName(userInfo){
    if (!userInfo) return "";
    let firstName = userInfo?.firstName || "";
    let lastName = userInfo?.lastName || "";
    lastName = lastName.trim();
    return firstName + (lastName.length > 0 ? " "+lastName : "");
}

function verifyReviewerPermission(context){
    verifySession(context)
        .verifyInitialized()
        .verifyRole([ROLES.ADMIN, ROLES.FEDERAL_LEAD]);
}

async function updateApplication(applicationCollection, application, prevStatus, userID) {
    if (prevStatus !== IN_PROGRESS) {
        application = {history: [], ...application};
        const historyEvent = HistoryEventBuilder.createEvent(userID, IN_PROGRESS, null);
        application.history.push(historyEvent);
    }
    // Save an email reminder when an inactive application is reactivated.
    application.inactiveReminder = false;
    const updateResult = await applicationCollection.update(application);
    if ((updateResult?.matchedCount || 0) < 1) {
        throw new Error(ERROR.APPLICATION_NOT_FOUND + application?._id);
    }
    return application;
}

async function logStateChange(logCollection, userInfo, application, prevStatus) {
    await logCollection.insert(
        UpdateApplicationStateEvent.create(
            userInfo?._id, userInfo?.email, userInfo?.IDP, application?._id, prevStatus, application?.status
        )
    );
}

const setDefaultIfNoName = (str) => {
    const name = str?.trim() ?? "";
    return (name.length > 0) ? (name) : "NA";
}

const sendEmails = {
    remindApplication: async (notificationService, emailParams, email, applicantName, application) => {
        await notificationService.remindApplicationsNotification(email, {
            firstName: applicantName
        },{
            study: setDefaultIfNoName(application?.studyAbbreviation),
            remindDay: emailParams.remindDay,
            differDay: emailParams.inactiveDays - emailParams.remindDay,
            url: emailParams.url
        });
    },
    inactiveApplications: async (notificationService, emailParams, email, applicantName, application) => {
        await notificationService.inactiveApplicationsNotification(email,{
            firstName: applicantName
        },{
            pi: `${applicantName}`,
            study: setDefaultIfNoName(application?.studyAbbreviation),
            officialEmail: emailParams.officialEmail,
            inactiveDays: emailParams.inactiveDays,
            url: emailParams.url
        })
    },
    submitApplication: async (notificationService, emailParams, context, application) => {
        const programName = application?.programName?.trim() ?? "";
        const associate = `the ${application?.studyAbbreviation} study` + (programName.length > 0 ? ` associated with the ${programName} program` : '');
        await notificationService.submitQuestionNotification({
            pi: `${context.userInfo.firstName} ${context.userInfo.lastName}`,
            associate,
            url: emailParams.url
        })
    }
}

module.exports = {
    Application
};
