import axiosX from "axios"
import store from "./store"

import { orthancApiUrl, prxyUrl } from "./globalConfigurations";

// Create an Axios instance
const axios = axiosX.create();

// Add an interceptor to the Axios instance
// axios.interceptors.request.use(config => {
//   // Add Basic Authentication header for local debug, remove-on-publish
//   config.headers.Authorization = 'Basic ' + btoa('assem:password');
//   return config;
// });

export default {
    updateAuthHeader() {
        axios.defaults.headers.common['token'] = localStorage.getItem("vue-token") 
    },
    // prxydone
    async loadOe2Configuration() {
        try{
            return (await axios.get(prxyUrl + "configuration")).data;
        }catch (ex){
            console.log(ex);
            return "{   \"HasCustomLogo\" : false,   \"Keycloak\" : null,   \"Plugins\" : {},   \"Tokens\" : {},   \"UiOptions\" : {} }";
        }
    },
    // prxydone
    async loadDicomWebServers() {
        return (await axios.get(prxyUrl + "dicom-web/servers")).data;
    },
    // prxydone
    async loadOrthancPeers() {
        return (await axios.get(prxyUrl + "peers")).data;
    },
    // prxydone
    async loadDicomModalities() {
        return (await axios.get(prxyUrl + "modalities")).data;
    },
    // prxydone
    async loadSystem() {
        return (await axios.get(prxyUrl + "system")).data;
    },
    //prxydone needs testing
    async sendToDicomWebServer(resourcesIds, destination) {
        const response = (await axios.post(prxyUrl + "dicom-web/servers/" + destination + "/stow", {
            "Resources" : resourcesIds,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    //prxydone
    async sendToOrthancPeer(resourcesIds, destination) {
        const response = (await axios.post(prxyUrl + "peers/" + destination + "/store", {
            "Resources" : resourcesIds,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    //prxydone
    async sendToOrthancPeerWithTransfers(resources, destination) {
        const response = (await axios.post(prxyUrl + "transfers/send", {
            "Resources" : resources,
            "Compression": "gzip",
            "Peer": destination,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    //prxydone
    async sendToDicomModality(resourcesIds, destination) {
        const response = (await axios.post(prxyUrl + "modalities/" + destination + "/store", {
            "Resources" : resourcesIds,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    //prxydone
    async getJobStatus(jobId) {
        const response = (await axios.get(prxyUrl + "jobs/" + jobId));
        return response.data;
    },
    //prxydone
    async deleteResource(level, orthancId) {
        return axios.delete(prxyUrl + this.pluralizeResourceLevel(level) + "/" + orthancId);
    },
    //prxydone
    async deleteResources(resourcesIds) {
        return axios.post(prxyUrl + "tools/bulk-delete", {
            "Resources": resourcesIds
        });
    },
    async cancelFindStudies() {
        if (window.axiosFindStudiesAbortController) {
            window.axiosFindStudiesAbortController.abort();
            window.axiosFindStudiesAbortController = null;
        }
    },
    //prxydone
    async findStudies(filterQuery, labels, LabelsConstraint) {
        await this.cancelFindStudies();
        window.axiosFindStudiesAbortController = new AbortController();

        let payload = {
            "Level": "Study",
            "Limit": store.state.configuration.uiOptions.MaxStudiesDisplayed,
            "Query": filterQuery,
            "RequestedTags": [
                "ModalitiesInStudy"
            ],
            "Expand": true
        };
        if (labels && labels.length > 0) {
            payload["Labels"] = labels;
            payload["LabelsConstraint"] = LabelsConstraint;
        }

        try {
            const response = await axios.post(prxyUrl + "tools/find", payload, {
                signal: window.axiosFindStudiesAbortController.signal
            });
            return response.data;
        } catch (error) {
            console.error('Error finding studies:', error);
            return []; // Handle error appropriately
        }
    },
    // prxydone
    async getLastChangeId() {
        const response = (await axios.get(prxyUrl + "last-change"));
        return response.data["Last"];
    },
    // prxydone
    async getChanges(since, limit) {
        const response = (await axios.get(prxyUrl + "changes?since=" + since + "&limit=" + limit));
        return response.data;
    },
    //prxydone
    async getSamePatientStudies(patientTags, tags) {
        if (!tags || tags.length == 0) {
            console.error("Unable to getSamePatientStudies if 'tags' is not defined or empty");
            return {};
        }
        
        let query = {};
        for (let tag of tags) {
            if (tag in patientTags) {
                query[tag] = patientTags[tag];
            }
        }
        console.log(query)

        const response = (await axios.post(prxyUrl + "tools/find-patient", {
            "Level": "Study",
            "Limit": store.state.configuration.uiOptions.MaxStudiesDisplayed,
            "Query": query,
            "Expand": false
        }));
        return response.data;
    },
    //prxydone
    async findPatient(patientId) {
        const response = (await axios.post( prxyUrl+ "tools/lookup", patientId));
        if (response.data.length == 1) {
            const patient = (await axios.get(prxyUrl + "patients/" + response.data[0]['ID']));
            return patient.data;
        } else {
            return null;
        }
    },
    //prxydone
    async findStudy(studyInstanceUid) {
        const response = (await axios.post(prxyUrl + "tools/lookup", studyInstanceUid));
        if (response.data.length == 1) {
            const study = (await axios.get(prxyUrl + "studies/" + response.data[0]['ID']));
            return study.data;
        } else {
            return null;
        }
    },
    async mergeSeriesInExistingStudy({seriesIds, targetStudyId, keepSource}) {
        const response = (await axios.post(orthancApiUrl + "studies/" + targetStudyId + "/merge", {
            "Resources": seriesIds,
            "KeepSource": keepSource,
            "Synchronous": false
        }));
        return response.data['ID'];
    },
    async cancelRemoteDicomFindStudies() {
        if (window.axioRemoteDicomFindStudiesAbortController) {
            window.axioRemoteDicomFindStudiesAbortController.abort();
            window.axioRemoteDicomFindStudiesAbortController = null;
        }
    },
    async remoteDicomFindStudies(remoteModality, filterQuery) {
        await this.cancelRemoteDicomFindStudies();
        window.axioRemoteDicomFindStudiesAbortController = new AbortController();
        
        try {
            const queryResponse = (await axios.post(orthancApiUrl + "modalities/" + remoteModality + "/query", {
                    "Level": "Study",
                    "Query": filterQuery
                }, 
                {
                    signal: window.axioRemoteDicomFindStudiesAbortController.signal
                })).data;
            console.log(queryResponse);
            const answers = (await axios.get(orthancApiUrl + "queries/" + queryResponse["ID"] + "/answers?expand&simplify")).data;
            console.log(answers);
            return answers;
        } catch (err)
        {
            console.log("Error during query:", err);  // TODO: display error to user
            return {};
        }

    },
    async remoteDicomRetrieveStudy(remoteModality, filterQuery, targetAet, level) {
        const response = (await axios.post(orthancApiUrl + "modalities/" + remoteModality + "/move", {
            "Level": level,
            "Resources" : [
                filterQuery
            ],
            "TargetAet": targetAet,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    async remoteModalityEcho(remoteModality) {
        return axios.post(orthancApiUrl + "modalities/" + remoteModality + "/echo", {});
    },
    async uploadFile(filecontent) {
        return (await axios.post(orthancApiUrl + "instances", filecontent)).data;
    },
    //prxydone
    async getPatient(orthancId) {
        return (await axios.get(prxyUrl + "patients/" + orthancId)).data;
    },
    //prxydone
    async getStudy(orthancId) {
        // returns the same result as a findStudies (including RequestedTags !)
        return (await axios.get(prxyUrl + "studies/" + orthancId + "?requestedTags=ModalitiesInStudy")).data;
    },
    //prxydone
    async getStudySeries(orthancId) {
        return (await axios.get(prxyUrl + "studies/" + orthancId + "/series")).data;
    },
    //prxydone
    async getSeriesInstances(orthancId) {
        return (await axios.get(prxyUrl + "series/" + orthancId + "/instances")).data;
    },
    //prxydone
    async getStudyInstances(orthancId) {
        return (await axios.get(prxyUrl + "studies/" + orthancId + "/instances")).data;
    },
    //prxydone
    async getSeriesParentStudy(orthancId) {
        return (await axios.get(prxyUrl + "series/" + orthancId + "/study")).data;
    },
    //prxydone
    async getInstanceParentStudy(orthancId) {
        return (await axios.get(prxyUrl + "instances/" + orthancId + "/study")).data;
    },
    //prxydone
    async getResourceStudy(orthancId, level) {
        if (level == "study") {
            return (await this.getStudy(orthancId));
        } else if (level == "series") {
            return (await this.getSeriesParentStudy(orthancId));
        } else if (level == "instance") {
            return (await this.getInstanceParentStudy(orthancId));
        } else {
            console.error("unsupported level for getResourceStudyId", level);
        }
    },
    //prxydone
    async getInstanceTags(orthancId) {
        return (await axios.get(prxyUrl + "instances/" + orthancId + "/tags")).data;
    },
    //prxydone
    async getSimplifiedInstanceTags(orthancId) {
        return (await axios.get(prxyUrl + "instances/" + orthancId + "/tags?simplify")).data;
    },
    //prxydone
    async getInstanceHeader(orthancId) {
        return (await axios.get(prxyUrl + "instances/" + orthancId + "/header")).data;
    },
    // prxydone
    async getStatistics() {
        return (await axios.get(prxyUrl + "statistics")).data;
    },
    async generateUid(level) {
        return (await axios.get(orthancApiUrl + "tools/generate-uid?level=" + level)).data;
    },
    async setVerboseLevel(level) {
        await axios.put(prxyUrl + "tools/log-level", level);
    },
    //prxydone
    async getVerboseLevel() {
        return (await axios.get(prxyUrl + "tools/log-level")).data;
    },

    async anonymizeResource({resourceLevel, orthancId, replaceTags={}, removeTags=[]}) {
        const response = (await axios.post(prxyUrl + this.pluralizeResourceLevel(resourceLevel) + "/" + orthancId + "/anonymize", {
            "Replace": replaceTags,
            "Remove": removeTags,
            "KeepSource": true,
            "Force": true,
            "Synchronous": false
        }))

        return response.data['ID'];
    },
    //prxydone
    async modifyResource({resourceLevel, orthancId, replaceTags={}, removeTags=[], keepTags=[], keepSource}) {
        const response = (await axios.post(prxyUrl + this.pluralizeResourceLevel(resourceLevel) + "/" + orthancId + "/modify", {
            "Replace": replaceTags,
            "Remove": removeTags,
            "Keep": keepTags,
            "KeepSource": keepSource,
            "KeepLabels": true,
            "Force": true,
            "Synchronous": false
        }))

        return response.data['ID'];
    },
    // prxydone
    async loadAllLabels() {
        const response = (await axios.get(prxyUrl + "tools/labels"));
        return response.data;
    },

    async addLabel({studyId, label}) {
        await axios.put(orthancApiUrl + "studies/" + studyId + "/labels/" + label, "");
        return label;
    },

    async removeLabel({studyId, label}) {
        await axios.delete(orthancApiUrl + "studies/" + studyId + "/labels/" + label);
        return label;
    },

    async removeAllLabels(studyId) {
        const labels = await this.getLabels(studyId);
        let promises = [];
        for (let label of labels) {
            promises.push(this.removeLabel({
                studyId: studyId,
                label: label
            }));
        }
        await Promise.all(promises);
        return labels;
    },
    //prxydone
    async getLabels(studyId) {
        const response = (await axios.get(prxyUrl + "studies/" + studyId + "/labels"));
        return response.data;
    },
    // async isAdmin(){
    //     let profile = await axios.get(this.getUserProfileUrl());
    //     if(typeof profile.data != 'undefined' )
    //         if(typeof profile.data.admin != 'undefined')
    //             return true;
    //     return false;
    // },

    async updateLabels({studyId, labels}) {
        const currentLabels = await this.getLabels(studyId);
        const labelsToRemove = currentLabels.filter(x => !labels.includes(x));
        const labelsToAdd = labels.filter(x => !currentLabels.includes(x));
        let promises = [];

        // console.log("labelsToRemove: ", labelsToRemove);
        // console.log("labelsToAdd: ", labelsToAdd);
        for (const label of labelsToRemove) {
            promises.push(this.removeLabel({
                studyId: studyId,
                label: label
            }));
        }
        for (const label of labelsToAdd) {
            promises.push(this.addLabel({
                studyId: studyId,
                label: label
            }));
        }
        await Promise.all(promises);
        return labelsToAdd.length > 0 || labelsToRemove.length > 0;
    },



    async createToken({tokenType, resourcesIds, level, validityDuration=null, id=null, expirationDate=null}) {
        let body = {
            "Resources" : [],
            "Type": tokenType
        }

        for (let resourceId of resourcesIds) {
            // the authorization are performed at study level -> get parent study id if needed
            const study = await this.getResourceStudy(resourceId, level);
            body["Resources"].push({
                "OrthancId": study["ID"],
                "DicomUid": study["MainDicomTags"]["StudyInstanceUID"],
                "Level": 'study'
            })
        }

        if (validityDuration != null) {
           body["ValidityDuration"] = validityDuration;
        }

        if (expirationDate != null) {
            body["ExpirationDate"] = expirationDate.toJSON();
        }

        if (id != null) {
            body["Id"] = id;
        }

        const response = (await axios.put(orthancApiUrl + "auth/tokens/" + tokenType, body));
        // console.log(response);
        
        return response.data;
    },
    async parseToken(tokenKey, tokenValue) {
        const response = (await axios.post(orthancApiUrl + "auth/tokens/decode", {
            "TokenKey": tokenKey,
            "TokenValue": tokenValue
        }))

        return response.data;
    },

    ////////////////////////////////////////// HELPERS
    getOsimisViewerUrl(level, resourceOrthancId) {
        return orthancApiUrl + 'osimis-viewer/app/index.html?' + level + '=' + resourceOrthancId;
    },
    getStoneViewerUrl(level, resourceDicomUid) {
        return orthancApiUrl + 'stone-webviewer/index.html?' + level + '=' + resourceDicomUid;
    },
    getVolViewUrl(level, resourceOrthancId) {
        const volViewVersion = store.state.configuration.installedPlugins.volview.Version;
        const urls = 'urls=[../' + this.pluralizeResourceLevel(level) + '/' + resourceOrthancId + '/archive]';
        if (volViewVersion == '1.0') {
            return orthancApiUrl + 'volview/index.html?' + urls;
        } else {
            return orthancApiUrl + 'volview/index.html?names=[archive.zip]&' + urls;
        }
    },
    getWsiViewerUrl(seriesOrthancId) {
        return orthancApiUrl + 'wsi/app/viewer.html?series=' + seriesOrthancId;
    },
    getPrincipalReportUrl(resourceOrthancId) {
        return orthancApiUrl + 'pr-report/app/index.html?study=' + resourceOrthancId;
    },
    getUserProfileUrl() {
        return orthancApiUrl + 'pr-report/getUserProfile';
    },
    getStoneViewerUrlForBulkStudies(studiesDicomIds) {
        return orthancApiUrl + 'stone-webviewer/index.html?study=' + studiesDicomIds.join(",");
    },
    getOhifViewerUrlForDicomJson(mode, resourceOrthancId) {
        if (mode == 'basic') {
            return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'viewer?url=../studies/' + resourceOrthancId + "/ohif-dicom-json";
        } else if (mode == 'vr') {
            return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'viewer?hangingprotocolId=mprAnd3DVolumeViewport&url=../studies/' + resourceOrthancId + "/ohif-dicom-json";
        } else if (mode == 'tmtv') {
            return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'tmtv?url=../studies/' + resourceOrthancId + "/ohif-dicom-json";
        } else if (mode == 'seg') {
            return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'segmentation?url=../studies/' + resourceOrthancId + "/ohif-dicom-json";
        } else if (mode == 'microscopy') {
            return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'microscopy?url=../studies/' + resourceOrthancId + "/ohif-dicom-json";
        }
    },
    getOhifViewerUrlForDicomWeb(mode, resourceDicomUid) {
        if (store.state.configuration.uiOptions.EnableOpenInOhifViewer3) {
            if (mode == 'basic') {
                return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'viewer?StudyInstanceUIDs=' + resourceDicomUid;
            } else if (mode == 'vr') {
                return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'viewer?hangingprotocolId=mprAnd3DVolumeViewport&StudyInstanceUIDs=' + resourceDicomUid;
            } else if (mode == 'tmtv') {
                return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'tmtv?StudyInstanceUIDs=' + resourceDicomUid;
            } else if (mode == 'seg') {
                return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'segmentation?StudyInstanceUIDs=' + resourceDicomUid;
            } else if (mode == 'microscopy') {
                return store.state.configuration.uiOptions.OhifViewer3PublicRoot + 'microscopy?StudyInstanceUIDs=' + resourceDicomUid;
            }
        } else {
            return store.state.configuration.uiOptions.OhifViewerPublicRoot + 'Viewer/' + resourceDicomUid;
        }
    },
    getOhifViewerUrlForDicomWebBulkStudies(mode, studiesDicomIds) {
        if (store.state.configuration.uiOptions.EnableOpenInOhifViewer3) {
            return this.getOhifViewerUrlForDicomWeb(mode, studiesDicomIds.join(","));
        } else {
            return null;
        }
    },
    getInstancePreviewUrl(orthancId) {
        return orthancApiUrl + "instances/" + orthancId + "/preview";
    },
    getInstancePdfUrl(orthancId) {
        return orthancApiUrl + "instances/" + orthancId + "/pdf";
    },
    getInstanceDownloadUrl(orthancId) {
        return orthancApiUrl + "instances/" + orthancId + "/file";
    },
    getDownloadZipUrl(level, resourceOrthancId) {
        return prxyUrl + this.pluralizeResourceLevel(level) + '/' + resourceOrthancId + '/archive';
    },
    getBulkDownloadZipUrl(resourcesOrthancId) {
        if (resourcesOrthancId.length > 0)
        {
            return prxyUrl + "tools/create-archive?resources=" + resourcesOrthancId.join(',');
        }
        return undefined;
    },
    getBulkDownloadDicomDirUrl(resourcesOrthancId) {
        if (resourcesOrthancId.length > 0)
        {
            return orthancApiUrl + "tools/create-media?resources=" + resourcesOrthancId.join(',');
        }
        return undefined;
    },
    // Disabled
    getDownloadDicomDirUrl(level, resourceOrthancId) {
        return orthancApiUrl + this.pluralizeResourceLevel(level) + '/' + resourceOrthancId + '/media';
    },
    getApiUrl(level, resourceOrthancId, subroute) {
        return prxyUrl + this.pluralizeResourceLevel(level) + '/' + resourceOrthancId + subroute;
    },

    pluralizeResourceLevel(level) {
        if (level == "study") {
            return "studies"
        } else if (level == "instance") {
            return "instances"
        } else if (level == "patient") {
            return "patients"
        } else if (level == "series") {
            return "series"
        }
    }
}
