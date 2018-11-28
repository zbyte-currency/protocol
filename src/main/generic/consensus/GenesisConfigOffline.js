class GenesisConfig {
    static main() {
        GenesisConfig.init(GenesisConfig.CONFIGS['main']);
    }

    static dev() {
        GenesisConfig.init(GenesisConfig.CONFIGS['dev']);
    }

    /**
     * @param {{NETWORK_ID:number,NETWORK_NAME:string}} config
     */
    static init(config) {
        if (GenesisConfig._config) throw new Error('GenesisConfig already initialized');
        if (!config.NETWORK_ID) throw new Error('Config is missing network id');
        if (!config.NETWORK_NAME) throw new Error('Config is missing network name');

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
}
Class.register(GenesisConfig);

GenesisConfig.CONFIGS = {
    main: {
        NETWORK_ID: 1,
        NETWORK_NAME: 'main'
    },

    dev: {
        NETWORK_ID: 2,
        NETWORK_NAME: 'dev'
    }
};
