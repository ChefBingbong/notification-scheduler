import { ChainId } from "@pancakeswap/chains";
import axios from "axios";
import BigNumber from "bignumber.js";
import cron from "node-cron";
import { formatUnits } from "viem";
import { chainlinkOracleABI } from "../blockchain/abi/chainLinkOracleABI";
import { getViemClient } from "../blockchain/client";
import { CHAINLINK_ORACLE_ADDRESS, COINGECKO_V3_API } from "../blockchain/constants";
import appConfig from "../config/config";
import { redisClient } from "../index";
import { RedisClient } from "../redis";
import { AppLogger } from "../util/logger";
import { fixPrefix, removePrefix } from "../util/utils";
import CronJob from "./utils/conUtils";
import { cronLock } from "./utils/cronLock";

export class GlobalTaskUtils extends AppLogger {
  protected job: CronJob; // Replace 'any' with the actual type of your job
  protected schedule: string;
  protected redisClient: RedisClient;
  static cakePrice: string;

  constructor(jobId: string, schedule: string, redisClient: RedisClient) {
    super();
    this.schedule = schedule;
    this.redisClient = redisClient;
    this.job = new CronJob(jobId, process, this.getLogger(jobId));
  }

  public async init(chainId: ChainId) {
    if (chainId !== ChainId.ETHEREUM) return;
    this.job.cronJob = cron.schedule(this.schedule, async () => {
      try {
        await cronLock.addToQueue(`${this.job.jobName}-${chainId}`, async () => {
          this.job.log.info(`${this.job.jobName} for ${chainId} chain - started`);

          await GlobalTaskUtils.updateGlobalCronState();

          this.job.log.info(`${this.job.jobName} for ${chainId} chain - finished \n`);
        });
      } catch (error) {
        this.job.log.error(`Error in ${this.job.jobName}for ${chainId} chain: ${error}`);
      }
    });
  }

  public static async updateGlobalCronState() {
    const tokenPrices = await GlobalTaskUtils.fetchMultipleTokenUSDPrice(["ethereum", "binancecoin"]);
    redisClient.setMultipleTokenPrices(tokenPrices);

    const subscribers = await GlobalTaskUtils.getAllActiveSubscribers();
    const formattedubscribers = removePrefix(subscribers);

    await redisClient.setSubscribers(fixPrefix(subscribers), "subscribers");
    await redisClient.setSubscribers(formattedubscribers, "subscribers_formatted");

    await GlobalTaskUtils.getCakePriceFromOracle().toString();
  }

  public static async fetchMultipleTokenUSDPrice(tokens: string[]): Promise<{ [token: string]: number }> {
    const idstr = tokens.join(",");
    const response = await axios.get(`${COINGECKO_V3_API}/price?ids=${idstr}&vs_currencies=usd`);
    const tokenPriceMap: { [token: string]: number } = {};
    tokens.forEach((token: string) => (tokenPriceMap[token] = response.data[token].usd));
    return tokenPriceMap;
  }

  public static async getAllActiveSubscribers(): Promise<string[]> {
    try {
      const subscriberResponse = await axios.get(
        `https://notify.walletconnect.com/${appConfig.walletConnectApiKey}/subscribers`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${appConfig.walletConnectSecretKey}`,
          },
        }
      );

      const subscriberResult = await subscriberResponse.data;
      return subscriberResult as any;
    } catch (error) {
      console.error("fetch subscribers error", error);
      return [];
    }
  }

  public static async getCakePriceFromOracle() {
    try {
      const data = await getViemClient({ chainId: ChainId.BSC }).readContract({
        abi: chainlinkOracleABI,
        address: CHAINLINK_ORACLE_ADDRESS,
        functionName: "latestAnswer",
      });
      const cakePrice = Number(Number(formatUnits(data, 8)).toFixed(2));
      GlobalTaskUtils.cakePrice = new BigNumber(cakePrice).toString();
    } catch (error) {
      console.error("viewUserInfoForLotteryId", error.message);
      GlobalTaskUtils.cakePrice = "0";
    }
  }
}

export const globalTasksJob = new GlobalTaskUtils(`global-tasks-cronTask`, appConfig.subscribersSchedule, redisClient);
