"use strict";
/*
 * This code was generated by
 * ___ _ _ _ _ _    _ ____    ____ ____ _    ____ ____ _  _ ____ ____ ____ ___ __   __
 *  |  | | | | |    | |  | __ |  | |__| | __ | __ |___ |\ | |___ |__/ |__|  | |  | |__/
 *  |  |_|_| | |___ | |__|    |__| |  | |    |__] |___ | \| |___ |  \ |  |  | |__| |  \
 *
 * Twilio - Chat
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
exports.ChannelPage = exports.ChannelListInstance = exports.ChannelInstance = exports.ChannelContextImpl = void 0;
const util_1 = require("util");
const Page_1 = __importDefault(require("../../../../base/Page"));
const deserialize = require("../../../../base/deserialize");
const serialize = require("../../../../base/serialize");
const utility_1 = require("../../../../base/utility");
const invite_1 = require("./channel/invite");
const member_1 = require("./channel/member");
const message_1 = require("./channel/message");
class ChannelContextImpl {
    constructor(_version, serviceSid, sid) {
        this._version = _version;
        if (!(0, utility_1.isValidPathParam)(serviceSid)) {
            throw new Error("Parameter 'serviceSid' is not valid.");
        }
        if (!(0, utility_1.isValidPathParam)(sid)) {
            throw new Error("Parameter 'sid' is not valid.");
        }
        this._solution = { serviceSid, sid };
        this._uri = `/Services/${serviceSid}/Channels/${sid}`;
    }
    get invites() {
        this._invites =
            this._invites ||
                (0, invite_1.InviteListInstance)(this._version, this._solution.serviceSid, this._solution.sid);
        return this._invites;
    }
    get members() {
        this._members =
            this._members ||
                (0, member_1.MemberListInstance)(this._version, this._solution.serviceSid, this._solution.sid);
        return this._members;
    }
    get messages() {
        this._messages =
            this._messages ||
                (0, message_1.MessageListInstance)(this._version, this._solution.serviceSid, this._solution.sid);
        return this._messages;
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
        operationPromise = operationPromise.then((payload) => new ChannelInstance(operationVersion, payload, instance._solution.serviceSid, instance._solution.sid));
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
        if (params["friendlyName"] !== undefined)
            data["FriendlyName"] = params["friendlyName"];
        if (params["uniqueName"] !== undefined)
            data["UniqueName"] = params["uniqueName"];
        if (params["attributes"] !== undefined)
            data["Attributes"] = params["attributes"];
        const headers = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        const instance = this;
        let operationVersion = instance._version, operationPromise = operationVersion.update({
            uri: instance._uri,
            method: "post",
            data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new ChannelInstance(operationVersion, payload, instance._solution.serviceSid, instance._solution.sid));
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
exports.ChannelContextImpl = ChannelContextImpl;
class ChannelInstance {
    constructor(_version, payload, serviceSid, sid) {
        this._version = _version;
        this.sid = payload.sid;
        this.accountSid = payload.account_sid;
        this.serviceSid = payload.service_sid;
        this.friendlyName = payload.friendly_name;
        this.uniqueName = payload.unique_name;
        this.attributes = payload.attributes;
        this.type = payload.type;
        this.dateCreated = deserialize.iso8601DateTime(payload.date_created);
        this.dateUpdated = deserialize.iso8601DateTime(payload.date_updated);
        this.createdBy = payload.created_by;
        this.membersCount = deserialize.integer(payload.members_count);
        this.messagesCount = deserialize.integer(payload.messages_count);
        this.url = payload.url;
        this.links = payload.links;
        this._solution = { serviceSid, sid: sid || this.sid };
    }
    get _proxy() {
        this._context =
            this._context ||
                new ChannelContextImpl(this._version, this._solution.serviceSid, this._solution.sid);
        return this._context;
    }
    /**
     * Remove a ChannelInstance
     *
     * @param callback - Callback to handle processed record
     *
     * @returns Resolves to processed boolean
     */
    remove(callback) {
        return this._proxy.remove(callback);
    }
    /**
     * Fetch a ChannelInstance
     *
     * @param callback - Callback to handle processed record
     *
     * @returns Resolves to processed ChannelInstance
     */
    fetch(callback) {
        return this._proxy.fetch(callback);
    }
    update(params, callback) {
        return this._proxy.update(params, callback);
    }
    /**
     * Access the invites.
     */
    invites() {
        return this._proxy.invites;
    }
    /**
     * Access the members.
     */
    members() {
        return this._proxy.members;
    }
    /**
     * Access the messages.
     */
    messages() {
        return this._proxy.messages;
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
            serviceSid: this.serviceSid,
            friendlyName: this.friendlyName,
            uniqueName: this.uniqueName,
            attributes: this.attributes,
            type: this.type,
            dateCreated: this.dateCreated,
            dateUpdated: this.dateUpdated,
            createdBy: this.createdBy,
            membersCount: this.membersCount,
            messagesCount: this.messagesCount,
            url: this.url,
            links: this.links,
        };
    }
    [util_1.inspect.custom](_depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.ChannelInstance = ChannelInstance;
function ChannelListInstance(version, serviceSid) {
    if (!(0, utility_1.isValidPathParam)(serviceSid)) {
        throw new Error("Parameter 'serviceSid' is not valid.");
    }
    const instance = ((sid) => instance.get(sid));
    instance.get = function get(sid) {
        return new ChannelContextImpl(version, serviceSid, sid);
    };
    instance._version = version;
    instance._solution = { serviceSid };
    instance._uri = `/Services/${serviceSid}/Channels`;
    instance.create = function create(params, callback) {
        if (params instanceof Function) {
            callback = params;
            params = {};
        }
        else {
            params = params || {};
        }
        let data = {};
        if (params["friendlyName"] !== undefined)
            data["FriendlyName"] = params["friendlyName"];
        if (params["uniqueName"] !== undefined)
            data["UniqueName"] = params["uniqueName"];
        if (params["attributes"] !== undefined)
            data["Attributes"] = params["attributes"];
        if (params["type"] !== undefined)
            data["Type"] = params["type"];
        const headers = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        let operationVersion = version, operationPromise = operationVersion.create({
            uri: instance._uri,
            method: "post",
            data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new ChannelInstance(operationVersion, payload, instance._solution.serviceSid));
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
        if (params["type"] !== undefined)
            data["Type"] = serialize.map(params["type"], (e) => e);
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
        operationPromise = operationPromise.then((payload) => new ChannelPage(operationVersion, payload, instance._solution));
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
        let pagePromise = operationPromise.then((payload) => new ChannelPage(instance._version, payload, instance._solution));
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
exports.ChannelListInstance = ChannelListInstance;
class ChannelPage extends Page_1.default {
    /**
     * Initialize the ChannelPage
     *
     * @param version - Version of the resource
     * @param response - Response from the API
     * @param solution - Path solution
     */
    constructor(version, response, solution) {
        super(version, response, solution);
    }
    /**
     * Build an instance of ChannelInstance
     *
     * @param payload - Payload response from the API
     */
    getInstance(payload) {
        return new ChannelInstance(this._version, payload, this._solution.serviceSid);
    }
    [util_1.inspect.custom](depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.ChannelPage = ChannelPage;