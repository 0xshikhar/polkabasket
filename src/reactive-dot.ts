export const config = {
  chains: {
    polkadot: {},
    polkadot_asset_hub: {},
    paseo: {},
    paseo_asset_hub: {},
  },
};

declare global {
  namespace App {
    interface Config {
      config: typeof config;
    }
  }
}
