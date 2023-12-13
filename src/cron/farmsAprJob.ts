import { ChainId } from "@pancakeswap/chains";
import { PublicClient } from "viem";
import { CHAIN_ID_TO_CHAIN_NAME } from "../blockchain/chains";
import { FARMS_V3_ENDPOINT } from "../blockchain/constants";
import appConfig from "../config/config";
import { farmV3ApiFetch, getCakeAprAndTVL } from "../graph/farms/fetchV3Farms";
import { getFarmLpApr } from "../graph/farms/getFarmLpApr";
import { TvlMap } from "../graph/farms/types";
import { redisClient } from "../index";
import fetchWithTimeout from "../util/fetchWithTimeout";
import {
  BuilderNames,
  getFarmAPRNotificationBody,
  getFarmAPRSNotificationBody,
  sendPushNotification,
} from "../util/pushUtils";
import { timeElapsed } from "../util/timeCalculator";
import { arrayToString, capitalizeFirstLetter, removePrefix } from "../util/utils";
import { GlobalTaskUtils } from "./globalCronTaskUtils";
import { SharedCronTask } from "./sharedCronTask";
import { loadBalancer } from "./utils/loadBalancerBatcher";

export type FarmStorage = {
  farmId: number;
  apr: number;
  cachedApr: number;
};

const supportedFarmsJobChains = [
  ChainId.ETHEREUM,
  ChainId.ZKSYNC,
  ChainId.BSC,
  ChainId.ARBITRUM_ONE,
  ChainId.LINEA,
  ChainId.POLYGON_ZKEVM,
];

export class FarmsAPRCheckTask extends SharedCronTask {
  constructor(jobId: string, schedule: string, supportedChains: ChainId[]) {
    super(jobId, schedule, supportedChains);
    loadBalancer.initializeInstance<ChainId>(`${this.job.jobName}`, supportedChains, 2);
  }

  public async init(chainId: ChainId) {
    const subscribers = await this.getSubscribers();
    await this.executeCronTask(chainId, subscribers, this.getClient(chainId));
  }

  protected async mainFunction(chainId: ChainId, users: string[], provider: PublicClient) {
    try {
      const farms = await farmV3ApiFetch(chainId);
      const cakePrice = GlobalTaskUtils.cakePrice;
      const farmInfo: { tvls: TvlMap; farmIds: number[]; farmSymbols: string[] } = {
        tvls: {},
        farmIds: [],
        farmSymbols: [],
      };

      const farmResultsWithPrice = await Promise.allSettled(
        farms.farmsWithPrice.map((f) =>
          fetchWithTimeout(`${FARMS_V3_ENDPOINT}/${chainId}/liquidity/${f.lpAddress}`)
            .then((farmLiquidity) => farmLiquidity.json())
            .catch((err) => {
              console.error(err);
              throw err;
            })
        )
      );
      farmResultsWithPrice.forEach((farmWithPrice, index: number) => {
        farmInfo.tvls[farms.farmsWithPrice[index].lpAddress] =
          farmWithPrice.status === "fulfilled"
            ? { ...farmWithPrice.value.formatted, updatedAt: farmWithPrice.value.updatedAt }
            : null;
      });

      const { lpAprs } = await getFarmLpApr({ addresses: Object.keys(farmInfo.tvls), chainId });

      const farmWithPriceAndCakeAPR = farms.farmsWithPrice
        .map((farm) => {
          const tvl = farmInfo.tvls[farm.lpAddress]!;
          farmInfo.farmIds.push(farm.pid);
          if (!tvl) return null;

          const { cakeApr } = getCakeAprAndTVL(farm, tvl, cakePrice, farms.cakePerSecond);
          return { farm, apr: Number((Number(cakeApr) + lpAprs[farm.lpAddress.toLowerCase()]).toFixed(2)) };
        })
        .filter((farm) => farm !== null);

      const { cachedAprs, cachedTimestamps } = await this.getRedisFarmCache(farmInfo.farmIds, chainId);
      const farmsToUpdate: FarmStorage[] = [];

      const currentTimestamp = Math.floor(new Date().getTime() / 1000);
      for (let farm = 0; farm < farmWithPriceAndCakeAPR.length; farm++) {
        const cachedTimestamp = cachedTimestamps[farm] ?? currentTimestamp;
        const currentApr = farmWithPriceAndCakeAPR[farm].apr;
        const cachedApr = cachedAprs[farm] ?? currentApr;

        if (currentApr === cachedApr) continue;
        const { inHours: timeSinceLastNotify } = timeElapsed(cachedTimestamp.toString());
        const percentageDifference = this.calculatePercentageIncrease(cachedApr, currentApr);
        console.log(percentageDifference);
        if (percentageDifference >= 25 && timeSinceLastNotify > 48) {
          if (percentageDifference >= 25) farmInfo.farmSymbols.push(farmWithPriceAndCakeAPR[farm].farm.lpSymbol);
          farmsToUpdate.push({
            farmId: farmWithPriceAndCakeAPR[farm].farm.pid,
            apr: currentApr,
            cachedApr,
          });
        }
      }

      if (farmsToUpdate.length > 0) {
        const notificationBody = this.getFarmNotificationBody(farmInfo.farmSymbols, farmsToUpdate, chainId);
        const chainName = capitalizeFirstLetter(CHAIN_ID_TO_CHAIN_NAME[chainId]);

        await sendPushNotification(
          BuilderNames.farmAprNotification,
          [users, notificationBody, chainName],
          removePrefix(users)
        );
        await this.updateFarmRedisCache(farmsToUpdate, chainId);
      }
    } catch (error) {
      console.error("Error fetching Ethereum price:", error);
    }
  }

  private getFarmNotificationBody(lpSymbols: string[], farmsToUpdate: FarmStorage[], chainId: ChainId) {
    const lpSymbolString = arrayToString(lpSymbols.length >= 3 ? lpSymbols.slice(0, 3) : lpSymbols);
    const network = CHAIN_ID_TO_CHAIN_NAME[chainId];
    const currentApr = farmsToUpdate[0].apr;
    const cachedApr = farmsToUpdate[0].cachedApr;

    const notificationBody =
      lpSymbols.length > 1
        ? getFarmAPRSNotificationBody(lpSymbolString, network)
        : getFarmAPRNotificationBody(lpSymbolString, network, currentApr, cachedApr);

    return notificationBody;
  }

  private async getRedisFarmCache(farmIds: number[], chainId: ChainId) {
    const farmCacheKeys = redisClient.getFarmCacheKeys(farmIds, chainId);
    const cachedAprs = await redisClient.getFarmAprs(farmCacheKeys.aprKeys);
    const cachedTimestamps = await redisClient.getFarmAprs(farmCacheKeys.timestamps);

    return { cachedAprs, cachedTimestamps };
  }

  private async updateFarmRedisCache(farmsToUpdate: FarmStorage[], chainId: ChainId) {
    const farmIdsToUpdate = farmsToUpdate.map((f) => f.farmId);
    const farmAprsToUpdate = farmsToUpdate.map((f) => f.apr);

    const updatedFarmCacheKeys = redisClient.getFarmCacheKeys(farmIdsToUpdate, chainId);
    await redisClient.setFarmAprs(updatedFarmCacheKeys.aprKeys, farmAprsToUpdate);
    await redisClient.setUserTimestamp(updatedFarmCacheKeys.timestamps);
  }

  private calculatePercentageIncrease(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 1;
    return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
  }
}

export const farmsAprCheck = new FarmsAPRCheckTask(
  `farms-apr-cronTask`,
  appConfig.farmAprSchedule,
  supportedFarmsJobChains
);
