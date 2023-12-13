import { ChainId } from "@pancakeswap/chains";
import cron from "node-cron";
import { Address, PublicClient } from "viem";
import { redisClient } from "..";
import { getViemClient } from "../blockchain/client";
import { AppLogger } from "../util/logger";
import CronJob from "./utils/conUtils";
import { cronLock } from "./utils/cronLock";
import { LoadBalancerBatcher, loadBalancer } from "./utils/loadBalancerBatcher";
import { formatedAdjustedDateOverflow } from "../util/utils";

export abstract class SharedCronTask extends AppLogger {
  protected job: CronJob;
  protected schedule: string;
  protected supportedChains: ChainId[];
  protected loadBalancer: LoadBalancerBatcher<unknown>;

  constructor(jobId: string, schedule: string, supportedChains: ChainId[]) {
    super();
    this.schedule = schedule;
    this.supportedChains = supportedChains;
    this.job = new CronJob(jobId, process, this.getLogger(jobId));
  }

  protected abstract mainFunction(
    chainId: ChainId,
    subscribers: Address[] | string[],
    provider?: PublicClient
  ): Promise<void>;

  protected abstract init(chainId: ChainId): Promise<void>;

  protected async executeCronTask<T extends string>(
    chainId: ChainId,
    subscribers: T[],
    provider?: PublicClient,
    overrideMainFunction?: (
      chainId: ChainId,
      subscribers: Address[] | string[],
      provider?: PublicClient
    ) => Promise<void>
  ) {
    if (!this.supportedChains.includes(chainId)) return;

    this.job.cronJob = cron.schedule(this.schedule, async () => {
      const currentJobBatch = LoadBalancerBatcher.getLoadBalancerInstance<ChainId>(`${this.job.jobName}`)?.currentGroup;
      if (currentJobBatch && !currentJobBatch.includes(chainId)) return;

      try {
        await cronLock.addToQueue(`${this.job.jobName}-${chainId}`, async () => {
          this.job.log.info(`${this.job.jobName} for ${chainId} chain - started`);

          overrideMainFunction
            ? await overrideMainFunction(chainId, subscribers, provider)
            : await this.mainFunction(chainId, subscribers, provider);

          this.job.log.info(`${this.job.jobName} for ${chainId} chain - finished \n`);
          if (currentJobBatch) loadBalancer.getNextGroup<ChainId>(`${this.job.jobName}`);
        });
      } catch (error) {
        this.job.log.error(`Error in ${this.job.jobName}for ${chainId} chain: ${error}`);
      }
    });
  }

  protected async calculateNewCronSchedule(endTime: number, secondsBuffer?: number, minutesBuffer?: number) {
    const roundEndTime = new Date(endTime * 1000);

    let hour = roundEndTime.getUTCHours();
    let minute = roundEndTime.getUTCMinutes() + minutesBuffer;
    let second = roundEndTime.getUTCSeconds() + secondsBuffer;

    const { newSecond, newMinute, newHour } = formatedAdjustedDateOverflow(second, minute, hour);
    return `${newSecond} ${newMinute} ${newHour} * * * *`;
  }

  protected getClient(chainId: ChainId): PublicClient {
    const provider = getViemClient({ chainId });
    return provider;
  }

  protected async getSubscribers(): Promise<string[]> {
    const subscribers = await redisClient.getSubscribers<string>("subscribers");
    return subscribers;
  }

  protected async getFormattedSubscribers(): Promise<Address[]> {
    const subscribersFormatted = await redisClient.getSubscribers<Address>("subscribers_formatted");
    return subscribersFormatted;
  }
}
