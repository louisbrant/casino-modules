"use strict";
/*
 * This code was generated by
 * ___ _ _ _ _ _    _ ____    ____ ____ _    ____ ____ _  _ ____ ____ ____ ___ __   __
 *  |  | | | | |    | |  | __ |  | |__| | __ | __ |___ |\ | |___ |__/ |__|  | |  | |__/
 *  |  |_|_| | |___ | |__|    |__| |  | |    |__] |___ | \| |___ |  \ |  |  | |__| |  \
 *
 * Twilio - Api
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
exports.DomainPage = exports.DomainListInstance = exports.DomainInstance = exports.DomainContextImpl = void 0;
const util_1 = require("util");
const Page_1 = __importDefault(require("../../../../../base/Page"));
const deserialize = require("../../../../../base/deserialize");
const serialize = require("../../../../../base/serialize");
const utility_1 = require("../../../../../base/utility");
const authTypes_1 = require("./domain/authTypes");
const credentialListMapping_1 = require("./domain/credentialListMapping");
const ipAccessControlListMapping_1 = require("./domain/ipAccessControlListMapping");
class DomainContextImpl {
    constructor(_version, accountSid, sid) {
        this._version = _version;
        if (!(0, utility_1.isValidPathParam)(accountSid)) {
            throw new Error("Parameter 'accountSid' is not valid.");
        }
        if (!(0, utility_1.isValidPathParam)(sid)) {
            throw new Error("Parameter 'sid' is not valid.");
        }
        this._solution = { accountSid, sid };
        this._uri = `/Accounts/${accountSid}/SIP/Domains/${sid}.json`;
    }
    get auth() {
        this._auth =
            this._auth ||
                (0, authTypes_1.AuthTypesListInstance)(this._version, this._solution.accountSid, this._solution.sid);
        return this._auth;
    }
    get credentialListMappings() {
        this._credentialListMappings =
            this._credentialListMappings ||
                (0, credentialListMapping_1.CredentialListMappingListInstance)(this._version, this._solution.accountSid, this._solution.sid);
        return this._credentialListMappings;
    }
    get ipAccessControlListMappings() {
        this._ipAccessControlListMappings =
            this._ipAccessControlListMappings ||
                (0, ipAccessControlListMapping_1.IpAccessControlListMappingListInstance)(this._version, this._solution.accountSid, this._solution.sid);
        return this._ipAccessControlListMappings;
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
        operationPromise = operationPromise.then((payload) => new DomainInstance(operationVersion, payload, instance._solution.accountSid, instance._solution.sid));
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
        if (params["voiceFallbackMethod"] !== undefined)
            data["VoiceFallbackMethod"] = params["voiceFallbackMethod"];
        if (params["voiceFallbackUrl"] !== undefined)
            data["VoiceFallbackUrl"] = params["voiceFallbackUrl"];
        if (params["voiceMethod"] !== undefined)
            data["VoiceMethod"] = params["voiceMethod"];
        if (params["voiceStatusCallbackMethod"] !== undefined)
            data["VoiceStatusCallbackMethod"] = params["voiceStatusCallbackMethod"];
        if (params["voiceStatusCallbackUrl"] !== undefined)
            data["VoiceStatusCallbackUrl"] = params["voiceStatusCallbackUrl"];
        if (params["voiceUrl"] !== undefined)
            data["VoiceUrl"] = params["voiceUrl"];
        if (params["sipRegistration"] !== undefined)
            data["SipRegistration"] = serialize.bool(params["sipRegistration"]);
        if (params["domainName"] !== undefined)
            data["DomainName"] = params["domainName"];
        if (params["emergencyCallingEnabled"] !== undefined)
            data["EmergencyCallingEnabled"] = serialize.bool(params["emergencyCallingEnabled"]);
        if (params["secure"] !== undefined)
            data["Secure"] = serialize.bool(params["secure"]);
        if (params["byocTrunkSid"] !== undefined)
            data["ByocTrunkSid"] = params["byocTrunkSid"];
        if (params["emergencyCallerSid"] !== undefined)
            data["EmergencyCallerSid"] = params["emergencyCallerSid"];
        const headers = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        const instance = this;
        let operationVersion = instance._version, operationPromise = operationVersion.update({
            uri: instance._uri,
            method: "post",
            data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new DomainInstance(operationVersion, payload, instance._solution.accountSid, instance._solution.sid));
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
exports.DomainContextImpl = DomainContextImpl;
class DomainInstance {
    constructor(_version, payload, accountSid, sid) {
        this._version = _version;
        this.accountSid = payload.account_sid;
        this.apiVersion = payload.api_version;
        this.authType = payload.auth_type;
        this.dateCreated = deserialize.rfc2822DateTime(payload.date_created);
        this.dateUpdated = deserialize.rfc2822DateTime(payload.date_updated);
        this.domainName = payload.domain_name;
        this.friendlyName = payload.friendly_name;
        this.sid = payload.sid;
        this.uri = payload.uri;
        this.voiceFallbackMethod = payload.voice_fallback_method;
        this.voiceFallbackUrl = payload.voice_fallback_url;
        this.voiceMethod = payload.voice_method;
        this.voiceStatusCallbackMethod = payload.voice_status_callback_method;
        this.voiceStatusCallbackUrl = payload.voice_status_callback_url;
        this.voiceUrl = payload.voice_url;
        this.subresourceUris = payload.subresource_uris;
        this.sipRegistration = payload.sip_registration;
        this.emergencyCallingEnabled = payload.emergency_calling_enabled;
        this.secure = payload.secure;
        this.byocTrunkSid = payload.byoc_trunk_sid;
        this.emergencyCallerSid = payload.emergency_caller_sid;
        this._solution = { accountSid, sid: sid || this.sid };
    }
    get _proxy() {
        this._context =
            this._context ||
                new DomainContextImpl(this._version, this._solution.accountSid, this._solution.sid);
        return this._context;
    }
    /**
     * Remove a DomainInstance
     *
     * @param callback - Callback to handle processed record
     *
     * @returns Resolves to processed boolean
     */
    remove(callback) {
        return this._proxy.remove(callback);
    }
    /**
     * Fetch a DomainInstance
     *
     * @param callback - Callback to handle processed record
     *
     * @returns Resolves to processed DomainInstance
     */
    fetch(callback) {
        return this._proxy.fetch(callback);
    }
    update(params, callback) {
        return this._proxy.update(params, callback);
    }
    /**
     * Access the auth.
     */
    auth() {
        return this._proxy.auth;
    }
    /**
     * Access the credentialListMappings.
     */
    credentialListMappings() {
        return this._proxy.credentialListMappings;
    }
    /**
     * Access the ipAccessControlListMappings.
     */
    ipAccessControlListMappings() {
        return this._proxy.ipAccessControlListMappings;
    }
    /**
     * Provide a user-friendly representation
     *
     * @returns Object
     */
    toJSON() {
        return {
            accountSid: this.accountSid,
            apiVersion: this.apiVersion,
            authType: this.authType,
            dateCreated: this.dateCreated,
            dateUpdated: this.dateUpdated,
            domainName: this.domainName,
            friendlyName: this.friendlyName,
            sid: this.sid,
            uri: this.uri,
            voiceFallbackMethod: this.voiceFallbackMethod,
            voiceFallbackUrl: this.voiceFallbackUrl,
            voiceMethod: this.voiceMethod,
            voiceStatusCallbackMethod: this.voiceStatusCallbackMethod,
            voiceStatusCallbackUrl: this.voiceStatusCallbackUrl,
            voiceUrl: this.voiceUrl,
            subresourceUris: this.subresourceUris,
            sipRegistration: this.sipRegistration,
            emergencyCallingEnabled: this.emergencyCallingEnabled,
            secure: this.secure,
            byocTrunkSid: this.byocTrunkSid,
            emergencyCallerSid: this.emergencyCallerSid,
        };
    }
    [util_1.inspect.custom](_depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.DomainInstance = DomainInstance;
function DomainListInstance(version, accountSid) {
    if (!(0, utility_1.isValidPathParam)(accountSid)) {
        throw new Error("Parameter 'accountSid' is not valid.");
    }
    const instance = ((sid) => instance.get(sid));
    instance.get = function get(sid) {
        return new DomainContextImpl(version, accountSid, sid);
    };
    instance._version = version;
    instance._solution = { accountSid };
    instance._uri = `/Accounts/${accountSid}/SIP/Domains.json`;
    instance.create = function create(params, callback) {
        if (params === null || params === undefined) {
            throw new Error('Required parameter "params" missing.');
        }
        if (params["domainName"] === null || params["domainName"] === undefined) {
            throw new Error("Required parameter \"params['domainName']\" missing.");
        }
        let data = {};
        data["DomainName"] = params["domainName"];
        if (params["friendlyName"] !== undefined)
            data["FriendlyName"] = params["friendlyName"];
        if (params["voiceUrl"] !== undefined)
            data["VoiceUrl"] = params["voiceUrl"];
        if (params["voiceMethod"] !== undefined)
            data["VoiceMethod"] = params["voiceMethod"];
        if (params["voiceFallbackUrl"] !== undefined)
            data["VoiceFallbackUrl"] = params["voiceFallbackUrl"];
        if (params["voiceFallbackMethod"] !== undefined)
            data["VoiceFallbackMethod"] = params["voiceFallbackMethod"];
        if (params["voiceStatusCallbackUrl"] !== undefined)
            data["VoiceStatusCallbackUrl"] = params["voiceStatusCallbackUrl"];
        if (params["voiceStatusCallbackMethod"] !== undefined)
            data["VoiceStatusCallbackMethod"] = params["voiceStatusCallbackMethod"];
        if (params["sipRegistration"] !== undefined)
            data["SipRegistration"] = serialize.bool(params["sipRegistration"]);
        if (params["emergencyCallingEnabled"] !== undefined)
            data["EmergencyCallingEnabled"] = serialize.bool(params["emergencyCallingEnabled"]);
        if (params["secure"] !== undefined)
            data["Secure"] = serialize.bool(params["secure"]);
        if (params["byocTrunkSid"] !== undefined)
            data["ByocTrunkSid"] = params["byocTrunkSid"];
        if (params["emergencyCallerSid"] !== undefined)
            data["EmergencyCallerSid"] = params["emergencyCallerSid"];
        const headers = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        let operationVersion = version, operationPromise = operationVersion.create({
            uri: instance._uri,
            method: "post",
            data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new DomainInstance(operationVersion, payload, instance._solution.accountSid));
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
        operationPromise = operationPromise.then((payload) => new DomainPage(operationVersion, payload, instance._solution));
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
        let pagePromise = operationPromise.then((payload) => new DomainPage(instance._version, payload, instance._solution));
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
exports.DomainListInstance = DomainListInstance;
class DomainPage extends Page_1.default {
    /**
     * Initialize the DomainPage
     *
     * @param version - Version of the resource
     * @param response - Response from the API
     * @param solution - Path solution
     */
    constructor(version, response, solution) {
        super(version, response, solution);
    }
    /**
     * Build an instance of DomainInstance
     *
     * @param payload - Payload response from the API
     */
    getInstance(payload) {
        return new DomainInstance(this._version, payload, this._solution.accountSid);
    }
    [util_1.inspect.custom](depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.DomainPage = DomainPage;