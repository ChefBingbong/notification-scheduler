import { ChainId } from "@pancakeswap/chains";
import { Address, formatUnits } from "viem";
import { multicallABI } from "../blockchain/abi/multicallABI";
import { getViemClient } from "../blockchain/client";
import { MULTICALL } from "../blockchain/constants";
import appConfig from "../config/config";
import { redisClient } from "../index";
import { nativeToId } from "../util/fetchTokenPrice";
import { BuilderNames, getBalanceNotificationBody, sendPushNotification } from "../util/pushUtils";
import { SharedCronTask } from "./sharedCronTask";
import { removePrefix } from "../util/utils";
import { loadBalancer } from "./utils/loadBalancerBatcher";

type BalanceStorage = {
  usersToNotify: string[];
  newUserBalances: number[];
  newUserBalanceKeys: string[];
};

export const nativeBalanceJobChains = [ChainId.ZKSYNC, ChainId.ARBITRUM_ONE, ChainId.ETHEREUM, ChainId.BSC];

export class NativeBalanceChecker extends SharedCronTask {
  constructor(jobId: string, schedule: string, supportedChains: ChainId[]) {
    super(jobId, schedule, supportedChains);
    loadBalancer.initializeInstance<ChainId>(`${this.job.jobName}`, supportedChains, 2);
  }

  public async init(chainId: ChainId) {
    const subscribers = await this.getFormattedSubscribers();
    await this.executeCronTask(chainId, subscribers);
  }

  protected async mainFunction(network: ChainId, users: Address[]) {
    try {
      const networkName = nativeToId(network);
      const tokenPrices = await redisClient.getMultipleTokenPrices();
      const marketPriceOfBalance = tokenPrices[networkName];

      const { userBalances } = await this.fetchUserBalances(users, network);
      const userBalanceKeys = redisClient.getBalanceKeys(users, network);
      const { cachedBalance } = await this.getUserBalance(userBalanceKeys);

      const newBalanceStorage: BalanceStorage = {
        usersToNotify: [],
        newUserBalances: [],
        newUserBalanceKeys: [],
      };

      for (let subscriberIndex = 0; subscriberIndex < users.length; subscriberIndex++) {
        const currentBalance = userBalances[subscriberIndex];
        const cachedUserBalance = cachedBalance[subscriberIndex];
        const userBalanceKey = userBalanceKeys[subscriberIndex];

        if (!cachedUserBalance) {
          newBalanceStorage.newUserBalanceKeys.push(userBalanceKey);
          newBalanceStorage.newUserBalances.push(currentBalance);
          continue;
        }

        if (currentBalance === cachedUserBalance) continue;

        const isBalanceBelowThreshold = marketPriceOfBalance * currentBalance < 15;

        if (currentBalance !== cachedUserBalance && isBalanceBelowThreshold) {
          newBalanceStorage.newUserBalanceKeys.push(userBalanceKey);
          newBalanceStorage.newUserBalances.push(currentBalance);
          newBalanceStorage.usersToNotify.push(`eip155:1:${users[subscriberIndex]}`);
        }
      }

      const notificationBody = getBalanceNotificationBody();
      await redisClient.setLatestUserBalance(newBalanceStorage.newUserBalanceKeys, newBalanceStorage.newUserBalances);

      if (newBalanceStorage.usersToNotify.length > 0) {
        await sendPushNotification(
          BuilderNames.lowBalanceNotification,
          [newBalanceStorage.usersToNotify, notificationBody, network],
          removePrefix(newBalanceStorage.usersToNotify)
        );
        // console.log(newBalanceStorage.usersToNotify.length);
      }
    } catch (error) {
      console.error(`Error fetching ${network} price for ${this.job.jobName}:`, error);
    }
  }

  private async getUserBalance(balanceKeys: string[]): Promise<{ cachedBalance: number[] }> {
    const cachedSubscriberBalance = await redisClient.getLatestUserBalance(balanceKeys);
    if (cachedSubscriberBalance) return { cachedBalance: cachedSubscriberBalance };
    return { cachedBalance: [] };
  }

  private async fetchUserBalances(users: Address[], chainId: ChainId) {
    const balanceCalls = users.map((user: Address) => this.balanceContractCalls(user, chainId));
    const aggregatedBalanceCalls = balanceCalls.filter((balanceCall) => balanceCall[0] !== null).flat();

    const client = getViemClient({ chainId });

    const balanceMulticallResult = await client.multicall({
      contracts: aggregatedBalanceCalls,
      allowFailure: false,
    });

    const userBalances = balanceMulticallResult.map((balance: bigint) => Number(formatUnits(balance, 18)));

    return { userBalances };
  }

  private balanceContractCalls(address: Address, chainId: ChainId) {
    return [
      { abi: multicallABI, address: MULTICALL[chainId], functionName: "getEthBalance", args: [address] },
    ] as const;
  }
}

export const nativeBalanceChecker = new NativeBalanceChecker(
  `balance-check-cronTask`,
  appConfig.nativeBalanceSchedule,
  nativeBalanceJobChains
);
