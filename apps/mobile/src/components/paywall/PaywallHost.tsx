import React from 'react';
import { usePaywallStore } from '../../stores/paywallStore';
import { PaywallModal } from './PaywallModal';

/** One mounted destination for all capability guards. */
export function PaywallHost() {
  const source = usePaywallStore(state => state.source);
  return <PaywallModal visible={source !== null} onClose={() => usePaywallStore.setState({ source: null })} />;
}
