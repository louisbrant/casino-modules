"use strict";
/*
 * This code was generated by
 * ___ _ _ _ _ _    _ ____    ____ ____ _    ____ ____ _  _ ____ ____ ____ ___ __   __
 *  |  | | | | |    | |  | __ |  | |__| | __ | __ |___ |\ | |___ |__/ |__|  | |  | |__/
 *  |  |_|_| | |___ | |__|    |__| |  | |    |__] |___ | \| |___ |  \ |  |  | |__| |  \
 *
 * Twilio - Trusthub
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
exports.TrustProductsPage = exports.TrustProductsListInstance = exports.TrustProductsInstance = exports.TrustProductsContextImpl = void 0;
const util_1 = require("util");
const Page_1 = __importDefault(require("../../../base/Page"));
const deserialize = require("../../../base/deserialize");
const serialize = require("../../../base/serialize");
const utility_1 = require("../../../base/utility");
const trustProductsChannelEndpointAssignment_1 = require("./trustProducts/trustProductsChannelEndpointAssignment");
const trustProductsEntityAssignments_1 = require("./trustProducts/trustProductsEntityAssignments");
const trustProductsEvaluations_1 = require("./trustProducts/trustProductsEvaluations");
class TrustProductsContextImpl {
    constructor(_version, sid) {
        this._version = _version;
        if (!(0, utility_1.isValidPathParam)(sid)) {
            throw new Error("Parameter 'sid' is not valid.");
        }
        this._solution = { sid };
        this._uri = `/TrustProducts/${sid}`;
    }
    get trustProductsChannelEndpointAssignment() {
        this._trustProductsChannelEndpointAssignment =
            this._trustProductsChannelEndpointAssignment ||
                (0, trustProductsChannelEndpointAssignment_1.TrustProductsChannelEndpointAssignmentListInstance)(this._version, this._solution.sid);
        return this._trustProductsChannelEndpointAssignment;
    }
    get trustProductsEntityAssignments() {
        this._trustProductsEntityAssignments =
            this._trustProductsEntityAssignments ||
                (0, trustProductsEntityAssignments_1.TrustProductsEntityAssignmentsListInstance)(this._version, this._solution.sid);
        return this._trustProductsEntityAssignments;
    }
    get trustProductsEvaluations() {
        this._trustProductsEvaluations =
            this._trustProductsEvaluations ||
                (0, trustProductsEvaluations_1.TrustProductsEvaluationsListInstance)(this._version, this._solution.sid);
        return this._trustProductsEvaluations;
    }
    remove(callback) {
        const instance = this;
        let operationVersion = instance._version, operationPromise = operationVersion.remove({
            uri: instance._uri,
            method: "delete",
        });
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    }
    fetch(callback) {
        const instance = this;
        let operationVersion = instance._version, operationPromise = operationVersion.fetch({
            uri: instance._uri,
            method: "get",
        });
        operationPromise = operationPromise.then((payload) => new TrustProductsInstance(operationVersion, payload, instance._solution.sid));
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    }
    update(params, callback) {
        if (params instanceof Function) {
            callback = params;
            params = {};
        }
        else {
            params = params || {};
        }
        let data = {};
        if (params["status"] !== undefined)
            data["Status"] = params["status"];
        if (params["statusCallback"] !== undefined)
            data["StatusCallback"] = params["statusCallback"];
        if (params["friendlyName"] !== undefined)
            data["FriendlyName"] = params["friendlyName"];
        if (params["email"] !== undefined)
            data["Email"] = params["email"];
        const headers = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        const instance = this;
        let operationVersion = instance._version, operationPromise = operationVersion.update({
            uri: instance._uri,
            method: "post",
            data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new TrustProductsInstance(operationVersion, payload, instance._solution.sid));
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
exports.TrustProductsContextImpl = TrustProductsContextImpl;
class TrustProductsInstance {
    constructor(_version, payload, sid) {
        this._version = _version;
        this.sid = payload.sid;
        this.accountSid = payload.account_sid;
        this.policySid = payload.policy_sid;
        this.friendlyName = payload.friendly_name;
        this.status = payload.status;
        this.validUntil = deserialize.iso8601DateTime(payload.valid_until);
        this.email = payload.email;
        this.statusCallback = payload.status_callback;
        this.dateCreated = deserialize.iso8601DateTime(payload.date_created);
        this.dateUpdated = deserialize.iso8601DateTime(payload.date_updated);
        this.url = payload.url;
        this.links = payload.links;
        this._solution = { sid: sid || this.sid };
    }
    get _proxy() {
        this._context =
            this._context ||
                new TrustProductsContextImpl(this._version, this._solution.sid);
        return this._context;
    }
    /**
     * Remove a TrustProductsInstance
     *
     * @param callback - Callback to handle processed record
     *
     * @returns Resolves to processed boolean
     */
    remove(callback) {
        return this._proxy.remove(callback);
    }
    /**
     * Fetch a TrustProductsInstance
     *
     * @param callback - Callback to handle processed record
     *
     * @returns Resolves to processed TrustProductsInstance
     */
    fetch(callback) {
        return this._proxy.fetch(callback);
    }
    update(params, callback) {
        return this._proxy.update(params, callback);
    }
    /**
     * Access the trustProductsChannelEndpointAssignment.
     */
    trustProductsChannelEndpointAssignment() {
        return this._proxy.trustProductsChannelEndpointAssignment;
    }
    /**
     * Access the trustProductsEntityAssignments.
     */
    trustProductsEntityAssignments() {
        return this._proxy.trustProductsEntityAssignments;
    }
    /**
     * Access the trustProductsEvaluations.
     */
    trustProductsEvaluations() {
        return this._proxy.trustProductsEvaluations;
    }
    /**
     * Provide a user-friendly representation
     *
     * @returns Object
     */
    toJSON() {
        return {
            sid: this.sid,
            accountSid: this.accountSid,
            policySid: this.policySid,
            friendlyName: this.friendlyName,
            status: this.status,
            validUntil: this.validUntil,
            email: this.email,
            statusCallback: this.statusCallback,
            dateCreated: this.dateCreated,
            dateUpdated: this.dateUpdated,
            url: this.url,
            links: this.links,
        };
    }
    [util_1.inspect.custom](_depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.TrustProductsInstance = TrustProductsInstance;
function TrustProductsListInstance(version) {
    const instance = ((sid) => instance.get(sid));
    instance.get = function get(sid) {
        return new TrustProductsContextImpl(version, sid);
    };
    instance._version = version;
    instance._solution = {};
    instance._uri = `/TrustProducts`;
    instance.create = function create(params, callback) {
        if (params === null || params === undefined) {
            throw new Error('Required parameter "params" missing.');
        }
        if (params["friendlyName"] === null ||
            params["friendlyName"] === undefined) {
            throw new Error("Required parameter \"params['friendlyName']\" missing.");
        }
        if (params["email"] === null || params["email"] === undefined) {
            throw new Error("Required parameter \"params['email']\" missing.");
        }
        if (params["policySid"] === null || params["policySid"] === undefined) {
            throw new Error("Required parameter \"params['policySid']\" missing.");
        }
        let data = {};
        data["FriendlyName"] = params["friendlyName"];
        data["Email"] = params["email"];
        data["PolicySid"] = params["policySid"];
        if (params["statusCallback"] !== undefined)
            data["StatusCallback"] = params["statusCallback"];
        const headers = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        let operationVersion = version, operationPromise = operationVersion.create({
            uri: instance._uri,
            method: "post",
            data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new TrustProductsInstance(operationVersion, payload));
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    };
    instance.page = function page(params, callback) {
        if (params instanceof Function) {
            callback = params;
            params = {};
        }
        else {
            params = params || {};
        }
        let data = {};
        if (params["status"] !== undefined)
            data["Status"] = params["status"];
        if (params["friendlyName"] !== undefined)
            data["FriendlyName"] = params["friendlyName"];
        if (params["policySid"] !== undefined)
            data["PolicySid"] = params["policySid"];
        if (params["pageSize"] !== undefined)
            data["PageSize"] = params["pageSize"];
        if (params.pageNumber !== undefined)
            data["Page"] = params.pageNumber;
        if (params.pageToken !== undefined)
            data["PageToken"] = params.pageToken;
        const headers = {};
        let operationVersion = version, operationPromise = operationVersion.page({
            uri: instance._uri,
            method: "get",
            params: data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new TrustProductsPage(operationVersion, payload, instance._solution));
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
        let pagePromise = operationPromise.then((payload) => new TrustProductsPage(instance._version, payload, instance._solution));
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
exports.TrustProductsListInstance = TrustProductsListInstance;
class TrustProductsPage extends Page_1.default {
    /**
     * Initialize the TrustProductsPage
     *
     * @param version - Version of the resource
     * @param response - Response from the API
     * @param solution - Path solution
     */
    constructor(version, response, solution) {
        super(version, response, solution);
    }
    /**
     * Build an instance of TrustProductsInstance
     *
     * @param payload - Payload response from the API
     */
    getInstance(payload) {
        return new TrustProductsInstance(this._version, payload);
    }
    [util_1.inspect.custom](depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.TrustProductsPage = TrustProductsPage;