import { type Address } from 'viem';

import { Logger, ErrorHandler } from '../common/decorators/index.js';
import { isBigint } from '../common/utils/index.js';
import { version } from '../version.js';
import { type LidoSDKCoreProps } from '../core/index.js';

import { Bus } from './bus.js';
import { type RequestStatusWithId } from './types.js';

export class LidoSDKWithdrawRequestsInfo {
  private readonly bus: Bus;

  constructor(props: LidoSDKCoreProps & { bus?: Bus }) {
    if (props.bus) this.bus = props.bus;
    else this.bus = new Bus(props, version);
  }

  // Utils

  @Logger('Utils:')
  @ErrorHandler('Error:')
  public async getWithdrawalRequestsInfo(props: { account: Address }) {
    const claimableInfo = await this.getClaimableRequestsInfo(props);
    const claimableETH = await this.getClaimableRequestsETHByAccount(props);
    const pendingInfo = await this.getPendingRequestsInfo(props);

    return {
      claimableInfo,
      pendingInfo,
      claimableETH,
    };
  }

  @Logger('Utils:')
  @ErrorHandler('Error:')
  public async getWithdrawalRequestsStatus(props: {
    account: Address;
  }): Promise<readonly RequestStatusWithId[]> {
    const requestsIds = await this.bus.views.getWithdrawalRequestsIds({
      account: props.account,
    });

    return this.bus.views.getWithdrawalStatus({ requestsIds });
  }

  @Logger('Utils:')
  @ErrorHandler('Error:')
  public async getClaimableRequestsInfo(props: { account: Address }): Promise<{
    claimableRequests: RequestStatusWithId[];
    claimableAmountStETH: bigint;
  }> {
    const requests = await this.getWithdrawalRequestsStatus(props);

    return requests.reduce(
      (acc, request) => {
        if (request.isFinalized && !request.isClaimed) {
          acc.claimableRequests.push(request);
          acc.claimableAmountStETH += request.amountOfStETH;
        }
        return acc;
      },
      { claimableRequests: [], claimableAmountStETH: BigInt(0) } as {
        claimableRequests: RequestStatusWithId[];
        claimableAmountStETH: bigint;
      },
    );
  }

  @Logger('Utils:')
  @ErrorHandler('Error:')
  public async getClaimableRequestsETHByIds(props: {
    claimableRequestsIds: (bigint | RequestStatusWithId)[];
  }): Promise<{
    ethByRequests: readonly bigint[];
    ethSum: bigint;
    hints: readonly bigint[];
  }> {
    const sortedIds = props.claimableRequestsIds
      .sort((aReq, bReq) => {
        if (isBigint(aReq) && isBigint(bReq)) {
          return aReq > bReq ? 1 : -1;
        }
        if (!isBigint(aReq) && !isBigint(bReq)) {
          return aReq.id > bReq.id ? 1 : -1;
        }

        return 0;
      })
      .map((req) => (isBigint(req) ? req : req.id));

    const hints = await this.bus.views.findCheckpointHints({
      sortedIds,
      lastIndex: await this.bus.views.getLastCheckpointIndex(),
    });

    const ethByRequests = await this.bus.views.getClaimableEther({
      sortedIds,
      hints,
    });
    const ethSum = ethByRequests.reduce((acc, eth) => acc + eth, BigInt(0));

    return { ethByRequests, ethSum, hints };
  }

  @Logger('Utils:')
  @ErrorHandler('Error:')
  public async getClaimableRequestsETHByAccount(props: {
    account: Address;
  }): Promise<{
    ethByRequests: readonly bigint[];
    ethSum: bigint;
    hints: readonly bigint[];
    requests: readonly RequestStatusWithId[];
    sortedIds: readonly bigint[];
  }> {
    const requests = await this.getWithdrawalRequestsStatus(props);

    const sortedIds = requests
      .map((req) => req.id)
      .sort((aReq, bReq) => (aReq > bReq ? 1 : -1));

    const hints = await this.bus.views.findCheckpointHints({
      sortedIds,
      lastIndex: await this.bus.views.getLastCheckpointIndex(),
    });

    const ethByRequests = await this.bus.views.getClaimableEther({
      sortedIds,
      hints,
    });
    const ethSum = ethByRequests.reduce((acc, eth) => acc + eth, BigInt(0));

    return { ethByRequests, ethSum, hints, requests, sortedIds };
  }

  @Logger('Utils:')
  @ErrorHandler('Error:')
  public async getPendingRequestsInfo(props: { account: Address }): Promise<{
    pendingRequests: RequestStatusWithId[];
    pendingAmountStETH: bigint;
  }> {
    const requests = await this.getWithdrawalRequestsStatus(props);

    return requests.reduce(
      (acc, request) => {
        if (!request.isFinalized && !request.isClaimed) {
          acc.pendingRequests.push(request);
          acc.pendingAmountStETH += request.amountOfStETH;
        }
        return acc;
      },
      { pendingRequests: [], pendingAmountStETH: BigInt(0) } as {
        pendingRequests: RequestStatusWithId[];
        pendingAmountStETH: bigint;
      },
    );
  }
}