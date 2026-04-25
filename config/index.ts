import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { monadTestnet } from 'wagmi/chains'
import { http } from 'wagmi'

export const config = getDefaultConfig({
  appName: 'FairWork Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'fallback',
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
  ssr: true,
})
