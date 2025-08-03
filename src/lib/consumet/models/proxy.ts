

import { ProxyConfig } from './types';
import { USER_AGENT } from '../utils';

export class Proxy {
  /**
   *
   * @param proxyConfig The proxy config (optional)
   * @param adapter The axios adapter (optional)
   */
  constructor(protected proxyConfig?: ProxyConfig) {
    if (proxyConfig) this.setProxy(proxyConfig);
  }
  private validUrl = /^https?:\/\/.+/;
  /**
   * Set or Change the proxy config
   */
  setProxy(proxyConfig: ProxyConfig) {
    // This functionality is removed as it depends on axios interceptors.
    // The logic will need to be re-implemented on a per-fetch basis if needed.
  }
}

export default Proxy;
