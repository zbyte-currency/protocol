class NetworkConfig {
    /**
     * @returns {NetworkConfig}
     */
    static getDefault() {
        return PlatformUtils.supportsWebRTC()
            ? new RtcNetworkConfig()
            : new DumbNetworkConfig();
    }

    /**
     * @constructor
     * @param {number} protocolMask
     */
    constructor(protocolMask) {
        /** @type {number} */
        this._protocolMask = protocolMask;

        /**
         * @type {KeyPair}
         * @protected
         */
        this._keyPair = null;

        /**
         * @type {PeerId}
         * @protected
         */
        this._peerId = null;

        /**
         * @type {Services}
         * @protected
         */
        this._services = null;
    }

    /**
     * @returns {void}
     */
    async initPersistent() {
        const db = await PeerKeyStore.getPersistent();
        await this._init(db);
    }

    /**
     * @returns {void}
     */
    async initVolatile() {
        const db = PeerKeyStore.createVolatile();
        await this._init(db);
    }

    /**
     * @private
     * @param {PeerKeyStore} db
     * @returns {void}
     */
    async _init(db) {
        if (this._keyPair) {
            return;
        }

        /** @type {KeyPair} */
        let keys = await db.get('keys');
        if (!keys) {
            keys = KeyPair.generate();
            await db.put('keys', keys);
        }

        this._keyPair = keys;
        this._peerId = keys.publicKey.toPeerId();
    }

    /**
     * @type {number}
     */
    get protocol() {
        throw 'Unimplemented';
    }

    /**
     * Used for filtering peer addresses by protocols.
     * @type {number}
     */
    get protocolMask() {
        return this._protocolMask;
    }

    /**
     * @type {KeyPair}
     */
    get keyPair() {
        return this._keyPair;
    }

    /**
     * @type {PublicKey}
     */
    get publicKey() {
        return this._keyPair.publicKey;
    }

    /**
     * @type {PeerId}
     */
    get peerId() {
        return this._peerId;
    }

    /**
     * @type {Services}
     */
    get services() {
        return this._services;
    }

    /**
     * @param {Services} services
     */
    set services(services) {
        this._services = services;
    }

    /**
     * @type {PeerAddress}
     */
    get peerAddress() {
        throw new Error('Not implemented');
    }

    /**
     * @param {number} protocol
     * @returns {boolean}
     */
    canConnect(protocol) {
        return (protocol & this._protocolMask) !== 0;
    }
}
Class.register(NetworkConfig);

class WsNetworkConfig extends NetworkConfig {
    /**
     * @constructor
     * @param {string} host
     * @param {number} port
     * @param {{enabled: boolean, port: number, address: string, header: string}} reverseProxy
     */
    constructor(host, port, reverseProxy) {
        super(Protocol.WS | Protocol.WSS);
        this._host = host;
        this._port = port;
        this._usingReverseProxy = reverseProxy.enabled;

        /* @type {{port: number, address: string, header: string}} */
        this._reverseProxyConfig = {
            port: reverseProxy.port,
            address: reverseProxy.address,
            header: reverseProxy.header
        };
    }

    /**
     * @type {number}
     * @override
     */
    get protocol() {
        return Protocol.WS;
    }

    /**
     * @type {number}
     */
    get port() {
        return this._port;
    }

    /**
     * @type {boolean}
     */
    get usingReverseProxy() {
        return this._usingReverseProxy;
    }

    /**
     * @type {{port: number, address: string, header: string}}
     */
    get reverseProxyConfig() {
        return this._reverseProxyConfig;
    }

    /**
     * @type {WsPeerAddress|WssPeerAddress}
     * @override
     */
    get peerAddress() {
        if (!this._services || !this._keyPair) {
            throw 'PeerAddress is not configured.';
        }

        const port = this._usingReverseProxy ? this._reverseProxyConfig.port : this._port;
        const peerAddress = new WsPeerAddress(
            this._services.provided, Date.now(), NetAddress.UNSPECIFIED,
            this.publicKey, /*distance*/ 0,
            this._host, port);

        if (!peerAddress.globallyReachable()) {
            throw 'PeerAddress not globally reachable.';
        }

        peerAddress.signature = Signature.create(this._keyPair.privateKey, this.publicKey, peerAddress.serializeContent());
        return peerAddress;
    }

    /**
     * @type {boolean}
     */
    get secure() {
        return false;
    }
}
Class.register(WsNetworkConfig);

class WssNetworkConfig extends WsNetworkConfig {
    /**
     * @constructor
     * @param {string} host
     * @param {number} port
     * @param {string} [key]
     * @param {string} [cert]
     * @param {{enabled: boolean, port: number, address: string, header: string}} reverseProxy
     */
    constructor(host, port, key, cert, reverseProxy) {
        super(host, port, reverseProxy);
        this._key = key;
        this._cert = cert;

        /** @type {{key: string, cert: string}} */
        this._sslConfig = {
            key: this._key,
            cert: this._cert
        };
    }

    /**
     * @type {number}
     * @override
     */
    get protocol() {
        return Protocol.WSS;
    }

    /**
     * @type {?{key: string, cert: string}}
     */
    get sslConfig() {
        return this._sslConfig;
    }

    /**
     * @type {WsPeerAddress|WssPeerAddress}
     * @override
     */
    get peerAddress() {
        if (!this._services || !this._keyPair) {
            throw 'PeerAddress is not configured.';
        }

        const port = this._usingReverseProxy ? this._reverseProxyConfig.port : this._port;
        const peerAddress = new WssPeerAddress(
            this._services.provided, Date.now(), NetAddress.UNSPECIFIED,
            this.publicKey, /*distance*/ 0,
            this._host, port);

        if (!peerAddress.globallyReachable()) {
            throw 'PeerAddress not globally reachable.';
        }

        peerAddress.signature = Signature.create(this._keyPair.privateKey, this.publicKey, peerAddress.serializeContent());
        return peerAddress;
    }

    /**
     * @type {boolean}
     */
    get secure() {
        return true;
    }
}
Class.register(WssNetworkConfig);

class RtcNetworkConfig extends NetworkConfig {
    /**
     * @constructor
     */
    constructor() {
        super((PlatformUtils.supportsWS() ? (Protocol.WS | Protocol.WSS) : Protocol.WSS) | Protocol.RTC);
        this._rtcConfig = {
            iceServers: [
                {urls: 'stun:stun.l.google.com:19302'},
                {urls: 'stun:stun.nimiq-network.com:19302'}
            ]
        };
    }

    /**
     * @type {number}
     * @override
     */
    get protocol() {
        return Protocol.RTC;
    }

    /**
     * @returns {?RTCConfiguration}
     */
    get rtcConfig() {
        return this._rtcConfig;
    }

    /**
     * @type {RtcPeerAddress}
     * @override
     */
    get peerAddress() {
        if (!this._services || !this._keyPair) {
            throw 'PeerAddress is not configured.';
        }

        const peerAddress = new RtcPeerAddress(
            this._services.provided, Date.now(), NetAddress.UNSPECIFIED,
            this.publicKey, /*distance*/ 0);
        peerAddress.signature = Signature.create(this._keyPair.privateKey, this.publicKey, peerAddress.serializeContent());
        return peerAddress;
    }
}
Class.register(RtcNetworkConfig);

class DumbNetworkConfig extends NetworkConfig {
    /**
     * @constructor
     */
    constructor() {
        // Browsers served through https only speak WSS. Everything else should also support WS.
        super(PlatformUtils.supportsWS() ? (Protocol.WS | Protocol.WSS) : Protocol.WSS);
    }

    /**
     * @type {number}
     * @override
     */
    get protocol() {
        return Protocol.DUMB;
    }

    /**
     * @type {DumbPeerAddress}
     * @override
     */
    get peerAddress() {
        if (!this._services || !this._keyPair) {
            throw 'PeerAddress is not configured.';
        }

        const peerAddress = new DumbPeerAddress(
            this._services.provided, Date.now(), NetAddress.UNSPECIFIED,
            this.publicKey, /*distance*/ 0);
        peerAddress.signature = Signature.create(this._keyPair.privateKey, this.publicKey, peerAddress.serializeContent());
        return peerAddress;
    }
}
Class.register(DumbNetworkConfig);
