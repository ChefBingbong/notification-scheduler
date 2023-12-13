import { ChainId } from "@pancakeswap/chains";
import { Address } from "viem";
import appConfig from "../config/config";
import { redisClient } from "../index";
import { nativeToId } from "../util/fetchTokenPrice";
import { BuilderNames, sendPushNotification } from "../util/pushUtils";
import { timeElapsed } from "../util/timeCalculator";
import { removePrefix } from "../util/utils";
import { SharedCronTask } from "./sharedCronTask";

export class PriceCheckTask extends SharedCronTask {
  constructor(jobId: string, schedule: string, supportedChains: ChainId[]) {
    super(jobId, schedule, supportedChains);
  }

  public async init(chainId: ChainId) {
    const subscribers = await this.getSubscribers();
    this.executeCronTask(chainId, subscribers);
  }

  protected async mainFunction(network: ChainId, users: Address[]) {
    try {
      const tokenPrices = await redisClient.getMultipleTokenPrices();
      const token = nativeToId(network);
      const currentPrice = tokenPrices[token];

      let { lastNotifiedTime, lastPrice } = await this.getPriceJobCachevalues(token, network);
      const { percentageIncrease, isPositive, hasFallen } = this.isPriceIncrease(lastPrice, currentPrice);

      const { inHours: timeSinceLastNotify } = timeElapsed(lastNotifiedTime);
      if (timeSinceLastNotify >= 2) this.updatePriceJobRedisCache(token, currentPrice, network);
      if (!isPositive) return;

      await sendPushNotification(
        BuilderNames.tokenPriceMovementNotification,
        [users, token, isPositive, percentageIncrease, currentPrice, lastPrice, hasFallen, network],
        removePrefix(users)
      );
      this.updatePriceJobRedisCache(token, currentPrice, network);
    } catch (error) {
      console.error(`Error fetching ${network} price for ${this.job.jobName}:`, error);
    }
  }

  private updatePriceJobRedisCache(token: string, price: number, network: ChainId): void {
    const timestampKey = redisClient.getUserTimestampKey(network, this.job.jobName, token);
    const latestPriceKey = redisClient.getPriceKey(token, network);
    redisClient.setUserTimestamp([timestampKey]);
    redisClient.setLastNativeTokenPrice(latestPriceKey, price.toString());
  }

  private async getPriceJobCachevalues(
    token: string,
    network: ChainId
  ): Promise<{ lastNotifiedTime: string | null; lastPrice: number | null }> {
    const timestampKey = redisClient.getUserTimestampKey(network, this.job.jobName, token);
    const latestPriceKey = redisClient.getPriceKey(token, network);
    const lastNotifiedTime = await redisClient.getUserTimestamp(timestampKey);
    const lastPrice = await redisClient.getLastNativeTokenPrice(latestPriceKey);
    return { lastNotifiedTime: lastNotifiedTime.toString(), lastPrice };
  }

  private isPriceIncrease(lastPrice: number, currentPrice: number) {
    const priceDifference = currentPrice - lastPrice;
    const percentageIncrease = (priceDifference / lastPrice) * 100;
    return {
      percentageIncrease: percentageIncrease.toFixed(2),
      isPositive: Math.abs(percentageIncrease) >= 2.0,
      hasFallen: Boolean(percentageIncrease > 0),
    };
  }
}

export const priceCheckTask = new PriceCheckTask(`token-price-check-cronTask`, appConfig.nativeBalanceSchedule, [
  ChainId.BSC,
  ChainId.ETHEREUM,
]);
