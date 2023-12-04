import { privateKeyToAccount } from 'viem/accounts';
import { Hash, PrivateKeyAccount, createWalletClient, http } from 'viem';
import { useTestsEnvs } from './use-test-envs.js';
import { CHAINS, VIEM_CHAINS } from '../../../src/index.js';

export const useAccount = () => {
  const { privateKey } = useTestsEnvs();
  const account = privateKeyToAccount(privateKey as Hash);
  return account;
};

export const useAltAccount = () => {
  const { privateKey } = useTestsEnvs();
  const altKey = '0x' + (BigInt(privateKey) + 1n).toString(16);
  const account = privateKeyToAccount(altKey as Hash);
  return account;
};

export const useWalletClient = (_account?: PrivateKeyAccount) => {
  const { chainId, rpcUrl } = useTestsEnvs();
  const account = _account ?? useAccount();

  const chain = VIEM_CHAINS[chainId as CHAINS];

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
    pollingInterval: 10_000,
  });
};
