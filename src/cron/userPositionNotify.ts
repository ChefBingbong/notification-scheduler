import { ChainId } from "@pancakeswap/chains";
import { Address, getAddress } from "viem";
import { loadBalancer } from "./utils/loadBalancerBatcher";
import { CHAIN_ID_TO_CHAIN_FORMATTED_NAME } from "../blockchain/chains";
import appConfig from "../config/config";
import {
  BatchPools,
  TickRange,
  getBatchUserPositionOutOfRange,
} from "../graph/userFarmPositions/getBatchUserPositionOutOfRange";
import { redisClient } from "../index";
import {
  BuilderNames,
  PancakeNotifications,
  getLPOutOfRangeBody,
  getLPsOutOfRangeBody,
  sendPushNotificationWithPayload,
} from "../util/pushUtils";
import { arrayToString } from "../util/utils";
import { SharedCronTask } from "./sharedCronTask";
import { LoadBalancerBatcher } from "./utils/loadBalancerBatcher";

export class UserPositionsNotifyTask extends SharedCronTask {
  constructor(jobId: string, schedule: string, supportedChains: ChainId[]) {
    super(jobId, schedule, supportedChains);
  }

  public async init(chainId: ChainId) {
    const subscribers = await this.getFormattedSubscribers();
    this.executeCronTask(chainId, subscribers, this.getClient(chainId));
  }

  protected async mainFunction(networkId: ChainId, users: Address[]): Promise<void> {
    const pools = LoadBalancerBatcher.getLoadBalancerInstance<Address>(
      `whitelist-farms-cronTask-${networkId}`
    )?.currentGroup;
    if (!pools) return;

    let symbolsMaping: { [x: string]: string[] } = {};
    const { tickLower, tickUpper } = await redisClient.getPoolTicks(networkId);

    await this.fetchUserPositionsAndSendNotification(networkId, tickLower, "tickLower", users, symbolsMaping);
    await this.fetchUserPositionsAndSendNotification(networkId, tickUpper, "tickUpper", users, symbolsMaping);

    const owners: Address[] = [];
    const usersDueForNotification = [...Object.keys(symbolsMaping)];

    if (usersDueForNotification && usersDueForNotification.length > 0) {
      const notificationPayloads = usersDueForNotification.map((owner, i) => {
        owners.push(owner as Address);

        const lpSymbols = [...Object.values(symbolsMaping)][i].filter((value, index, self) => {
          return self.indexOf(value) === index;
        });

        const subscriberBody = this.getNotificationBody(lpSymbols, networkId);
        return PancakeNotifications[BuilderNames.LPOutOfRangeNotification]([[`eip155:1:${owner}`], subscriberBody]);
      });

      const notificationProms = notificationPayloads.map((payload) =>
        this.sendPushNotificationWithPayload(payload, owners)
      );
      await Promise.all(notificationProms);
    }
    loadBalancer.getNextGroup<Address>(`whitelist-farms-cronTask-${networkId}`);
  }

  private async fetchUserPositionsAndSendNotification(
    networkId: ChainId,
    batchPositions: BatchPools[],
    tickRange: TickRange,
    users: Address[],
    symbolsMaping: { [x: string]: string[] }
  ): Promise<void> {
    if (batchPositions.length === 0) return;

    const lpSymbolMap = await redisClient.getPoolLPSymbol(networkId);
    const result = await getBatchUserPositionOutOfRange(networkId, batchPositions, users);

    const keysToCheck: string[] = [];
    const keysToSet: string[] = [];
    const userInfo: { networkId: number; id: string; poolAddress: string; userAddress: string }[] = [];
    const newBatchPositions: BatchPools[] = [];

    for (const [queryName, userPositions] of result.entries()) {
      const { pool, tick } = this.parsePoolAndTick(queryName);
      const lastTimeStamp = Number(userPositions[userPositions.length - 1]?.createdAtTimestamp);

      if (userPositions.length === 1000) {
        newBatchPositions.push({ poolId: pool, tick: tick, tickRangeOut: tickRange, lastTimeStamp: lastTimeStamp });
      }
      for (const userPosition of userPositions) {
        const { id, pool, owner } = userPosition;
        const userAddress = getAddress(owner);

        keysToCheck.push(`user-position-${networkId}-${id}-${pool.id}-${userAddress}`);
        userInfo.push({ networkId, id, poolAddress: pool.id, userAddress });
      }
    }
    const existResults = await redisClient.existUserNotificationBatch(keysToCheck);
    for (let i = 0; i < keysToCheck.length; i++) {
      const owner = userInfo[i].userAddress;
      const pool = userInfo[i].poolAddress.toLowerCase();

      keysToSet.push(keysToCheck[i]);
      if (!existResults[i]) {
        symbolsMaping[owner] = symbolsMaping[owner]
          ? [...symbolsMaping[owner], lpSymbolMap[pool]]
          : [lpSymbolMap[pool]];
      }
    }
    await redisClient.storeUseNotificationBatch(keysToSet, "notification");
    await this.fetchUserPositionsAndSendNotification(networkId, newBatchPositions, tickRange, users, symbolsMaping);
  }

  private getNotificationBody(lpSymbols: string[], networkId: ChainId): string {
    const lpSymbolString = arrayToString(lpSymbols.length >= 4 ? lpSymbols.slice(0, 4) : lpSymbols);
    return lpSymbols.length > 1
      ? getLPsOutOfRangeBody(CHAIN_ID_TO_CHAIN_FORMATTED_NAME[networkId], lpSymbolString)
      : getLPOutOfRangeBody(CHAIN_ID_TO_CHAIN_FORMATTED_NAME[networkId], lpSymbolString);
  }

  private async sendPushNotificationWithPayload(payload: any, owners: Address[]): Promise<void> {
    await sendPushNotificationWithPayload(payload, owners);
  }

  private parsePoolAndTick(queryName: string): { pool: string; tick: number } {
    const params = queryName.replace(/^pool/, "").split("tick");
    if (params.length !== 2) {
      throw Error(`Incorrect Pool subQuery name. ${queryName}`);
    }
    if (params[1].includes("minus")) {
      const tick = params[1].replace(/minus/, "");
      return { pool: params[0], tick: Number(tick) * -1 };
    }
    return { pool: params[0], tick: Number(params[1]) };
  }
}

export const userPositionNotifyCheck = new UserPositionsNotifyTask(
  `user-positions-notify-cronTask`,
  appConfig.positionNotifySchedule,
  [ChainId.BSC, ChainId.ETHEREUM]
);
