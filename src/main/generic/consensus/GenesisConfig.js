class GenesisConfig {
    static main() {
        GenesisConfig.init(GenesisConfig.CONFIGS['main']);
    }

    static dev() {
        GenesisConfig.init(GenesisConfig.CONFIGS['dev']);
    }

    /**
     * @param {{NETWORK_ID:number,NETWORK_NAME:string,GENESIS_BLOCK:Block,GENESIS_ACCOUNTS:string,SEED_PEERS:Array.<PeerAddress>}} config
     */
    static init(config) {
        if (GenesisConfig._config) throw new Error('GenesisConfig already initialized');
        if (!config.NETWORK_ID) throw new Error('Config is missing network id');
        if (!config.NETWORK_NAME) throw new Error('Config is missing network name');
        if (!config.GENESIS_BLOCK) throw new Error('Config is missing genesis block');
        if (!config.SEED_PEERS) throw new Error('Config is missing seed peers');

        GenesisConfig._config = config;
    }

    /**
     * @type {number}
     */
    static get NETWORK_ID() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.NETWORK_ID;
    }

    /**
     * @type {string}
     */
    static get NETWORK_NAME() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.NETWORK_NAME;
    }

    /**
     * @type {Block}
     */
    static get GENESIS_BLOCK() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.GENESIS_BLOCK;
    }

    /**
     * @type {Hash}
     */
    static get GENESIS_HASH() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        if (!GenesisConfig._config.GENESIS_HASH) {
            GenesisConfig._config.GENESIS_HASH = GenesisConfig._config.GENESIS_BLOCK.hash();
        }
        return GenesisConfig._config.GENESIS_HASH;
    }

    /**
     * @type {string}
     */
    static get GENESIS_ACCOUNTS() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.GENESIS_ACCOUNTS;
    }

    /**
     * @type {Array.<PeerAddress>}
     */
    static get SEED_PEERS() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.SEED_PEERS;
    }

    /**
     * @type {Array.<SeedList>}
     */
    static get SEED_LISTS() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.SEED_LISTS;
    }
}
Class.register(GenesisConfig);

GenesisConfig.CONFIGS = {
    main: {
        NETWORK_ID: 1,
        NETWORK_NAME: 'main',
        SEED_PEERS: [
            //WssPeerAddress.seed('seed-1.nimiq.com', 8443, 'b70d0c3e6cdf95485cac0688b086597a5139bc4237173023c83411331ef90507'),
        ],
        SEED_LISTS: [
            //new SeedListUrl('https://nimiq.community/seeds.txt', '8b4ae04557f490102036ce3e570b39058c92fc5669083fb9bbb6effc91dc3c71')
        ],
        GENESIS_BLOCK: new Block(
            new BlockHeader(
                new Hash(null),
                new Hash(null),
                Hash.fromBase64('fNqaf98GZVkFrl29nFNUUUcbB4+m898OKH5bD7R6Vzo='),
                Hash.fromBase64('H+/UTx+pcYX9oh6VdUXJfcdkP6fk792G4KpCRNHgvFw='),
                BlockUtils.difficultyToCompact(1),
                1,
                1523727000,
                137689,
                BlockHeader.Version.V1),
            new BlockInterlink([], new Hash(null)),
            new BlockBody(Address.fromBase64('BBBBBBBBBBBBBBBBBBBBBBBBBBB='), [], BufferUtils.fromBase64(''))
        )
    },

    dev: {
        NETWORK_ID: 2,
        NETWORK_NAME: 'dev',
        SEED_PEERS: [],
        SEED_LISTS: [],
        GENESIS_BLOCK: new Block(
            new BlockHeader(
                new Hash(null),
                new Hash(null),
                Hash.fromBase64('JvMr9c9l2m8HWNdFAGTEastKH+aDZvln9EopXelhVIg='),
                Hash.fromBase64('1t/Zm91tN0p178+ePcxyR5bPxvC6jFLskqiidFFO3wY='),
                BlockUtils.difficultyToCompact(1),
                1,
                1522338300,
                12432,
                BlockHeader.Version.V1),
            new BlockInterlink([], new Hash(null)),
            new BlockBody(Address.fromBase64('BBBBBBBBBBBBBBBBBBBBBBBBBBB='), [], BufferUtils.fromBase64('RGV2TmV0'))
        )
    }
};
