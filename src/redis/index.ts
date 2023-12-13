import { ChainId } from "@pancakeswap/chains";
import Redis from "ioredis";
import { Address } from "viem";
import { Logger } from "winston";
import { ClaimTimeDetails } from "../graph";
import { BatchPools } from "../graph/userFarmPositions/getBatchUserPositionOutOfRange";
import { WhitelistedFarms } from "../model/farms";
import { AppLogger } from "../util/logger";

export class RedisClient extends AppLogger {
  public client: Redis;
  public staticClient: RedisClient;
  public log: Logger;

  constructor(redisUrl: string) {
    super();
    this.log = this.getLogger("redis-client");
    this.client = new Redis(redisUrl as any);
    this.setUpListeners(this.client);
    this.staticClient = this;
  }

  private setUpListeners(client: Redis) {
    client.on("error", (err) => this.log.info(`Redis Client Error. Error: ${err}`));
    client.on("connect", () => this.log.info("Redis Client is connect"));
    client.on("reconnecting", () => this.log.info("Redis Client is reconnecting"));
    client.on("ready", () => this.log.info("Redis Client is ready"));
  }

  async existRequestTimeout(): Promise<boolean> {
    return (await this.client.exists("test")) > 0;
  }

  public async initializeFallback(redisUrl: string): Promise<void> {
    this.client = new Redis(redisUrl as any);
    this.setUpListeners(this.client);
  }

  public async duplicateWithExpireCallback(redisUrl: string, expireCallback: (key: string) => void): Promise<void> {
    // In DigitalOcean this config is set by using api
    //await client.config('SET', 'notify-keyspace-events', 'Ex')
    const sub = this.client.duplicate();
    await sub.subscribe("__keyevent@0__:expired");

    sub.on("message", async (channel, key) => {
      expireCallback(key as string);
    });

    this.client = new Redis(redisUrl as any);
    this.setUpListeners(this.client);
  }

  async getSubscribers<T extends string>(key: "subscribers" | "subscribers_formatted"): Promise<T[] | null> {
    const res = await this.client.get(key);

    if (res) {
      return JSON.parse(res) as T[];
    }

    return null;
  }

  async setSubscribers<T>(data: T[], key: "subscribers" | "subscribers_formatted"): Promise<void> {
    await this.client.set(key, JSON.stringify(data));
  }

  async getMultipleTokenPrices(): Promise<{ [token: string]: number } | null> {
    const res = await this.client.get("multiple-prices");
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setMultipleTokenPrices(data: { [token: string]: number }): Promise<void> {
    await this.client.set("multiple-prices", JSON.stringify(data));
  }

  getWhitelistedFarmKey = (networkId: number) => `whitelistedFarms-${networkId}`;
  getBalanceKeys = (users: string[], networkId: number): string[] => {
    return users.map((user) => `balance-${user}-${networkId}`);
  };
  getFarmCacheKeys = (farmIds: number[], network: ChainId) => {
    return {
      aprKeys: farmIds.map((id: number) => `farm-${id}-${network}`),
      timestamps: farmIds.map((id: number) => `farm-timestamp-${id}-${network}`),
    };
  };
  getPriceKey = (token: string, networkId: number) => `latestPrice-${token}-${networkId}`;
  getUserTimestampKey = (networkId: number, job: string, user: string) => `timestamp-${job}-${user}-${networkId}`;
  getUserTimestampKeys = (networkId: number, job: string, users: string[]) => {
    return users.map((user) => `timestamp-${job}-${user}-${networkId}`);
  };
  getUserPositionNotificationKey = (
    networkId: number,
    userPositionId: string,
    poolAddress: string,
    userAddress: string
  ) => `user-position-${networkId}-${userPositionId}-${poolAddress}-${userAddress}`;

  async getPoolTicks(networkId: number): Promise<{
    tickUpper: BatchPools[];
    tickLower: BatchPools[];
  } | null> {
    const res = await this.client.get(`ticks-map-${networkId}`);
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setPoolTicks(networkId: number, data: any) {
    await this.client.set(`ticks-map-${networkId}`, JSON.stringify(data));
  }

  async getPoolLPSymbol(networkId: number): Promise<any | null> {
    const res = await this.client.get(`lpsymbol-map-${networkId}`);
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setPoolLpSymbol(networkId: number, data: any) {
    await this.client.set(`lpsymbol-map-${networkId}`, JSON.stringify(data));
  }

  async getWhitelistedFarm(networkId: number): Promise<WhitelistedFarms | null> {
    const res = await this.client.get(this.getWhitelistedFarmKey(networkId));
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async storeWhitelistedFarms(networkId: number, data: WhitelistedFarms) {
    await this.client.set(this.getWhitelistedFarmKey(networkId), JSON.stringify(data));
  }

  async getCampaignClaimEndTime(campaign: string): Promise<ClaimTimeDetails | null> {
    const res = await this.client.get(campaign);
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setCampaignClaimTimes(campaign: string, data: ClaimTimeDetails) {
    await this.client.set(campaign, JSON.stringify(data));
  }

  async existUserNotificationBatch(keys: string[]): Promise<boolean[]> {
    const pipeline = this.client.pipeline();
    keys.forEach((key) => pipeline.exists(key));

    const results = await pipeline.exec();

    return results.map(([_, result]: any[]) => result > 0);
  }

  async storeUseNotificationBatch(keys: string[], data: any, timeoutMS?: number): Promise<void> {
    if (timeoutMS === undefined) {
      timeoutMS = 1000 * 60 * 60 * 24 * 5;
    }

    const pipeline = this.client.pipeline();

    keys.forEach((key) => pipeline.set(key, JSON.stringify(data), "PX", timeoutMS));

    await pipeline.exec();
  }

  async existUserPositionNotification(
    networkId: number,
    userPositionId: string,
    poolAddress: string,
    userAddress: string
  ) {
    const key = this.getUserPositionNotificationKey(networkId, userPositionId, poolAddress, userAddress);
    return (await this.client.exists(key)) > 0;
  }

  async existUserPositionNotifications(keys: string[]): Promise<any> {
    const results: string[] = [];
    const found: string[] = [];

    for (const key of keys) {
      const exists = await this.client.exists(key);
      if (exists <= 0) results.push(key);
      else found.push(key);
    }

    return { results, found };
  }

  async storeUserPositionNotification(
    networkId: number,
    userPositionId: string,
    poolAddress: string,
    userAddress: string,
    data: any,
    timeoutMS?: number
  ) {
    if (timeoutMS === undefined) {
      timeoutMS = 1000 * 60 * 60 * 24 * 3;
    }
    const key = this.getUserPositionNotificationKey(networkId, userPositionId, poolAddress, userAddress);
    await this.client.set(key, JSON.stringify(data), "PX", timeoutMS);
  }

  public async storeUserPositionNotifications(userKeys: string[], data: any): Promise<void> {
    const pipeline = this.client.multi();
    userKeys.forEach((key, i) => {
      pipeline.set(key, JSON.stringify(data[i]));
    });

    pipeline.exec((error, results) => {
      if (error) {
        console.error("Error:", error);
      }
    });
  }

  async getAllUserPositionNotifications(networkId: number, user: string): Promise<any> {
    const pattern = this.getUserPositionNotificationKey(networkId, "*", "*", "*");
    const keys = await this.scanKeys(pattern);

    // Fetch values for each key
    const values = await Promise.all(keys.map(async (key) => this.client.get(key)));

    // Parse JSON values
    const notifications = values.map((value) => JSON.parse(value));

    return { values, notifications };
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      const result = await this.client.scan(cursor, "MATCH", pattern, "COUNT", "100");
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== "0");

    return keys;
  }

  async getLotteryRoundNotified(key: string): Promise<boolean | null> {
    const res = await this.client.get(key);
    if (res) {
      return JSON.parse(res);
    }

    return false;
  }

  async setUserSubsetIndex(key: string, data: Address): Promise<void> {
    await this.client.set("user-subset-value", JSON.stringify(data));
  }

  async getUserSubsetIndex(key: string): Promise<Address | null> {
    const res = await this.client.get(key);
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setFarmsChunkIndex(index: number): Promise<void> {
    await this.client.set("farms-chunk-index", JSON.stringify(index));
  }

  async getFarmsChunkIndex(): Promise<number> {
    const res = await this.client.get("farms-chunk-index");
    if (res) {
      return JSON.parse(res);
    }

    return 0;
  }

  async setFarmAprs(keys: string[], data: number[]): Promise<void> {
    const pipeline = this.client.multi();
    keys.forEach((key, index) => {
      pipeline.set(key, data[index]);
    });

    pipeline.exec((error, results) => {
      if (error) {
        console.error("Error:", error);
      }
    });
  }

  async getFarmAprs(keys: string[]): Promise<number[] | null> {
    const farmAprs = await this.client.mget(...keys);
    // Convert the array of string results to an array of numbers or null
    const parsedFarmAprs = farmAprs.map((apr) => (apr && apr !== "NaN" ? JSON.parse(apr) : null));

    return parsedFarmAprs;
  }

  async setLotteryRoundNotified(key: string, data: boolean): Promise<void> {
    await this.client.set(key, JSON.stringify(data));
  }

  async getUserTimestamp(key: string): Promise<number | null> {
    const res = await this.client.get(key);
    if (res) {
      return JSON.parse(res);
    }

    await this.setUserTimestamp([key]);
    const fallbackRes: string = await this.client.get(key);
    return JSON.parse(fallbackRes);
  }

  async getUserTimestamps(users: string[]): Promise<number[] | null> {
    const timestamps = await this.client.mget(...users);

    // Convert the array of string results to an array of numbers or null
    const parsedTimestamps = timestamps.map((timestamp) => (timestamp ? JSON.parse(timestamp) : null));

    return parsedTimestamps;
  }

  public async setUserTimestamp(userKeys: string[]): Promise<void> {
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    const pipeline = this.client.multi();
    userKeys.forEach((key) => {
      pipeline.set(key, currentTimestamp);
    });

    pipeline.exec((error, results) => {
      if (error) {
        console.error("Error:", error);
      }
    });
  }

  async setLatestUserBalance(userKeys: string[], newBalances: number[]): Promise<void> {
    const pipeline = this.client.multi();
    userKeys.forEach((key, index) => {
      pipeline.set(key, newBalances[index]);
    });

    pipeline.exec((error, results) => {
      if (error) {
        console.error("Error:", error);
      }
    });
  }

  async getLatestUserBalance(users: string[]): Promise<number[] | null> {
    const balances = await this.client.mget(...users);

    // Convert the array of string results to an array of numbers or null
    const parsedBalances = balances.map((balance) => (balance ? JSON.parse(balance) : null));

    return parsedBalances;
  }

  async getLastNativeTokenPrice(token: string): Promise<number | null> {
    const res = await this.client.get(token);
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setLastNativeTokenPrice(token: string, data: string): Promise<void> {
    await this.client.set(token, JSON.stringify(data));
  }
}
