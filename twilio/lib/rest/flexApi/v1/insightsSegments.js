"use strict";
/*
 * This code was generated by
 * ___ _ _ _ _ _    _ ____    ____ ____ _    ____ ____ _  _ ____ ____ ____ ___ __   __
 *  |  | | | | |    | |  | __ |  | |__| | __ | __ |___ |\ | |___ |__/ |__|  | |  | |__/
 *  |  |_|_| | |___ | |__|    |__| |  | |    |__] |___ | \| |___ |  \ |  |  | |__| |  \
 *
 * Twilio - Flex
 * This is the public Twilio REST API.
 *
 * NOTE: This class is auto generated by OpenAPI Generator.
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsSegmentsPage = exports.InsightsSegmentsListInstance = exports.InsightsSegmentsInstance = exports.InsightsSegmentsContextImpl = void 0;
const util_1 = require("util");
const Page_1 = __importDefault(require("../../../base/Page"));
const deserialize = require("../../../base/deserialize");
const serialize = require("../../../base/serialize");
const utility_1 = require("../../../base/utility");
class InsightsSegmentsContextImpl {
    constructor(_version, segmentId) {
        this._version = _version;
        if (!(0, utility_1.isValidPathParam)(segmentId)) {
            throw new Error("Parameter 'segmentId' is not valid.");
        }
        this._solution = { segmentId };
        this._uri = `/Insights/Segments/${segmentId}`;
    }
    fetch(params, callback) {
        if (params instanceof Function) {
            callback = params;
            params = {};
        }
        else {
            params = params || {};
        }
        let data = {};
        const headers = {};
        if (params["token"] !== undefined)
            headers["Token"] = params["token"];
        const instance = this;
        let operationVersion = instance._version, operationPromise = operationVersion.fetch({
            uri: instance._uri,
            method: "get",
            params: data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new InsightsSegmentsInstance(operationVersion, payload, instance._solution.segmentId));
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    }
    /**
     * Provide a user-friendly representation
     *
     * @returns Object
     */
    toJSON() {
        return this._solution;
    }
    [util_1.inspect.custom](_depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.InsightsSegmentsContextImpl = InsightsSegmentsContextImpl;
class InsightsSegmentsInstance {
    constructor(_version, payload, segmentId) {
        this._version = _version;
        this.segmentId = payload.segment_id;
        this.externalId = payload.external_id;
        this.queue = payload.queue;
        this.externalContact = payload.external_contact;
        this.externalSegmentLinkId = payload.external_segment_link_id;
        this.date = payload.date;
        this.accountId = payload.account_id;
        this.externalSegmentLink = payload.external_segment_link;
        this.agentId = payload.agent_id;
        this.agentPhone = payload.agent_phone;
        this.agentName = payload.agent_name;
        this.agentTeamName = payload.agent_team_name;
        this.agentTeamNameInHierarchy = payload.agent_team_name_in_hierarchy;
        this.agentLink = payload.agent_link;
        this.customerPhone = payload.customer_phone;
        this.customerName = payload.customer_name;
        this.customerLink = payload.customer_link;
        this.segmentRecordingOffset = payload.segment_recording_offset;
        this.media = payload.media;
        this.assessmentType = payload.assessment_type;
        this.assessmentPercentage = payload.assessment_percentage;
        this.url = payload.url;
        this._solution = { segmentId: segmentId || this.segmentId };
    }
    get _proxy() {
        this._context =
            this._context ||
                new InsightsSegmentsContextImpl(this._version, this._solution.segmentId);
        return this._context;
    }
    fetch(params, callback) {
        return this._proxy.fetch(params, callback);
    }
    /**
     * Provide a user-friendly representation
     *
     * @returns Object
     */
    toJSON() {
        return {
            segmentId: this.segmentId,
            externalId: this.externalId,
            queue: this.queue,
            externalContact: this.externalContact,
            externalSegmentLinkId: this.externalSegmentLinkId,
            date: this.date,
            accountId: this.accountId,
            externalSegmentLink: this.externalSegmentLink,
            agentId: this.agentId,
            agentPhone: this.agentPhone,
            agentName: this.agentName,
            agentTeamName: this.agentTeamName,
            agentTeamNameInHierarchy: this.agentTeamNameInHierarchy,
            agentLink: this.agentLink,
            customerPhone: this.customerPhone,
            customerName: this.customerName,
            customerLink: this.customerLink,
            segmentRecordingOffset: this.segmentRecordingOffset,
            media: this.media,
            assessmentType: this.assessmentType,
            assessmentPercentage: this.assessmentPercentage,
            url: this.url,
        };
    }
    [util_1.inspect.custom](_depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.InsightsSegmentsInstance = InsightsSegmentsInstance;
function InsightsSegmentsListInstance(version) {
    const instance = ((segmentId) => instance.get(segmentId));
    instance.get = function get(segmentId) {
        return new InsightsSegmentsContextImpl(version, segmentId);
    };
    instance._version = version;
    instance._solution = {};
    instance._uri = `/Insights/Segments`;
    instance.page = function page(params, callback) {
        if (params instanceof Function) {
            callback = params;
            params = {};
        }
        else {
            params = params || {};
        }
        let data = {};
        if (params["reservationId"] !== undefined)
            data["ReservationId"] = serialize.map(params["reservationId"], (e) => e);
        if (params["pageSize"] !== undefined)
            data["PageSize"] = params["pageSize"];
        if (params.pageNumber !== undefined)
            data["Page"] = params.pageNumber;
        if (params.pageToken !== undefined)
            data["PageToken"] = params.pageToken;
        const headers = {};
        if (params["token"] !== undefined)
            headers["Token"] = params["token"];
        let operationVersion = version, operationPromise = operationVersion.page({
            uri: instance._uri,
            method: "get",
            params: data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new InsightsSegmentsPage(operationVersion, payload, instance._solution));
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    };
    instance.each = instance._version.each;
    instance.list = instance._version.list;
    instance.getPage = function getPage(targetUrl, callback) {
        const operationPromise = instance._version._domain.twilio.request({
            method: "get",
            uri: targetUrl,
        });
        let pagePromise = operationPromise.then((payload) => new InsightsSegmentsPage(instance._version, payload, instance._solution));
        pagePromise = instance._version.setPromiseCallback(pagePromise, callback);
        return pagePromise;
    };
    instance.toJSON = function toJSON() {
        return instance._solution;
    };
    instance[util_1.inspect.custom] = function inspectImpl(_depth, options) {
        return (0, util_1.inspect)(instance.toJSON(), options);
    };
    return instance;
}
exports.InsightsSegmentsListInstance = InsightsSegmentsListInstance;
class InsightsSegmentsPage extends Page_1.default {
    /**
     * Initialize the InsightsSegmentsPage
     *
     * @param version - Version of the resource
     * @param response - Response from the API
     * @param solution - Path solution
     */
    constructor(version, response, solution) {
        super(version, response, solution);
    }
    /**
     * Build an instance of InsightsSegmentsInstance
     *
     * @param payload - Payload response from the API
     */
    getInstance(payload) {
        return new InsightsSegmentsInstance(this._version, payload);
    }
    [util_1.inspect.custom](depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.InsightsSegmentsPage = InsightsSegmentsPage;
